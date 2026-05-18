import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { ChatService } from '../chat/chat.service';
import { UpsertWhatsappIntegrationDto } from './dto/upsert-whatsapp-integration.dto';
import { WhatsappCryptoService } from './whatsapp-crypto.service';
import { WhatsappIntegration } from './whatsapp-integration.entity';
import { WhatsappMessageEvent } from './whatsapp-message-event.entity';
import {
  WhatsappInboundMessage,
  WhatsappWebhookPayload,
} from './whatsapp.types';

type WhatsappIntegrationStatus = {
  id: string;
  userId: string;
  phoneNumberId: string;
  wabaId: string;
  businessName: string | null;
  isActive: boolean;
  webhookUrl: string;
  lastWebhookAt: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @InjectRepository(WhatsappIntegration)
    private readonly integrationRepo: Repository<WhatsappIntegration>,
    @InjectRepository(WhatsappMessageEvent)
    private readonly eventRepo: Repository<WhatsappMessageEvent>,
    private readonly config: ConfigService,
    private readonly crypto: WhatsappCryptoService,
    private readonly chatService: ChatService,
  ) {}

  async getIntegration(userId: string): Promise<WhatsappIntegrationStatus | null> {
    const integration = await this.integrationRepo.findOne({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });

    return integration ? this.toStatus(integration) : null;
  }

  async upsertIntegration(
    userId: string,
    dto: UpsertWhatsappIntegrationDto,
  ): Promise<WhatsappIntegrationStatus & { verifyToken: string }> {
    const phoneNumberId = dto.phoneNumberId?.trim();
    const wabaId = dto.wabaId?.trim();
    const accessToken = dto.accessToken?.trim();
    const appSecret = dto.appSecret?.trim();

    if (!phoneNumberId) throw new BadRequestException('phoneNumberId is required');
    if (!wabaId) throw new BadRequestException('wabaId is required');
    if (!accessToken) throw new BadRequestException('accessToken is required');
    if (!appSecret) throw new BadRequestException('appSecret is required');

    const existingByPhone = await this.integrationRepo.findOne({
      where: { phoneNumberId },
    });
    if (existingByPhone && existingByPhone.userId !== userId) {
      throw new ConflictException('This WhatsApp phone number is already connected to another user');
    }

    const existingForUser = await this.integrationRepo.findOne({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
    const verifyToken = this.generateVerifyToken();

    const integration = existingForUser ?? this.integrationRepo.create({ userId });
    integration.phoneNumberId = phoneNumberId;
    integration.wabaId = wabaId;
    integration.businessName = dto.businessName?.trim() || null;
    integration.encryptedAccessToken = this.crypto.encrypt(accessToken);
    integration.encryptedAppSecret = this.crypto.encrypt(appSecret);
    integration.verifyTokenHash = this.crypto.hashToken(verifyToken);
    integration.isActive = true;

    const saved = await this.integrationRepo.save(integration);

    return {
      ...this.toStatus(saved),
      verifyToken,
    };
  }

  async disconnectIntegration(userId: string): Promise<void> {
    const integration = await this.integrationRepo.findOne({ where: { userId } });
    if (!integration) throw new NotFoundException('WhatsApp integration not found');
    await this.integrationRepo.remove(integration);
  }

  async verifyWebhook(mode?: string, token?: string, challenge?: string): Promise<string> {
    if (mode !== 'subscribe' || !token || !challenge) {
      throw new BadRequestException('Invalid webhook verification request');
    }

    const integration = await this.integrationRepo.findOne({
      where: {
        verifyTokenHash: this.crypto.hashToken(token),
        isActive: true,
      },
    });
    if (!integration) throw new ForbiddenException('Invalid WhatsApp verify token');

    return challenge;
  }

  async handleWebhook(
    payload: WhatsappWebhookPayload,
    signature: string | undefined,
    rawBody: Buffer | undefined,
  ): Promise<{ received: true }> {
    const changes = payload.entry?.flatMap((entry) => entry.changes ?? []) ?? [];
    if (changes.length === 0) return { received: true };

    for (const change of changes) {
      const phoneNumberId = change.value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const integration = await this.integrationRepo.findOne({
        where: { phoneNumberId, isActive: true },
      });
      if (!integration) {
        this.logger.warn(`Ignoring WhatsApp webhook for unknown phone_number_id ${phoneNumberId}`);
        continue;
      }

      this.verifySignature(
        rawBody,
        signature,
        this.crypto.decrypt(integration.encryptedAppSecret),
      );

      integration.lastWebhookAt = new Date();
      await this.integrationRepo.save(integration);

      for (const message of change.value?.messages ?? []) {
        await this.handleMessage(integration, message);
      }
    }

    return { received: true };
  }

  private async handleMessage(
    integration: WhatsappIntegration,
    message: WhatsappInboundMessage,
  ): Promise<void> {
    const metaMessageId = message.id;
    const from = message.from;
    if (!metaMessageId || !from) return;

    const event = await this.createEvent(metaMessageId, integration, 'received');
    if (!event) return;

    try {
      if (message.type !== 'text' || !message.text?.body?.trim()) {
        await this.sendTextMessage(
          integration,
          from,
          'Please send a text message so I can help.',
        );
        await this.markEvent(event, 'ignored');
        return;
      }

      const sessionId = `whatsapp:${integration.phoneNumberId}:${from}`;
      const { answer } = await this.chatService.chat(
        message.text.body.trim(),
        sessionId,
        integration.userId,
      );

      await this.sendTextMessage(integration, from, answer);
      await this.markEvent(event, 'processed');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown WhatsApp processing error';
      this.logger.error(`Failed to process WhatsApp message ${metaMessageId}: ${message}`);
      await this.markEvent(event, 'failed', message);
    }
  }

  private async createEvent(
    metaMessageId: string,
    integration: WhatsappIntegration,
    status: WhatsappMessageEvent['status'],
  ): Promise<WhatsappMessageEvent | null> {
    const existing = await this.eventRepo.findOne({ where: { metaMessageId } });
    if (existing) return null;

    try {
      return await this.eventRepo.save(
        this.eventRepo.create({
          metaMessageId,
          phoneNumberId: integration.phoneNumberId,
          userId: integration.userId,
          status,
        }),
      );
    } catch (err) {
      if (this.isUniqueViolation(err)) return null;
      throw err;
    }
  }

  private async markEvent(
    event: WhatsappMessageEvent,
    status: WhatsappMessageEvent['status'],
    error?: string,
  ): Promise<void> {
    event.status = status;
    event.error = error ?? null;
    await this.eventRepo.save(event);
  }

  private async sendTextMessage(
    integration: WhatsappIntegration,
    to: string,
    body: string,
  ): Promise<void> {
    const graphVersion = this.config.get<string>('whatsapp.graphVersion') ?? 'v24.0';
    const accessToken = this.crypto.decrypt(integration.encryptedAccessToken);
    const url = `https://graph.facebook.com/${graphVersion}/${integration.phoneNumberId}/messages`;

    await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
          preview_url: false,
          body,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  private verifySignature(
    rawBody: Buffer | undefined,
    signature: string | undefined,
    appSecret: string,
  ): void {
    if (!rawBody) throw new UnauthorizedException('Missing raw request body');
    if (!signature?.startsWith('sha256=')) {
      throw new UnauthorizedException('Missing WhatsApp signature');
    }

    const expected = this.cryptoSignature(rawBody, appSecret);
    const received = signature.slice('sha256='.length);
    const expectedBuffer = Buffer.from(expected, 'hex');
    const receivedBuffer = Buffer.from(received, 'hex');

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      throw new UnauthorizedException('Invalid WhatsApp signature');
    }
  }

  private cryptoSignature(rawBody: Buffer, appSecret: string): string {
    return createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');
  }

  private generateVerifyToken(): string {
    return `wvt_${randomBytes(24).toString('hex')}`;
  }

  private toStatus(integration: WhatsappIntegration): WhatsappIntegrationStatus {
    return {
      id: integration.id,
      userId: integration.userId,
      phoneNumberId: integration.phoneNumberId,
      wabaId: integration.wabaId,
      businessName: integration.businessName ?? null,
      isActive: integration.isActive,
      webhookUrl: `${this.config.get<string>('appUrl')?.replace(/\/$/, '')}/whatsapp/webhook`,
      lastWebhookAt: integration.lastWebhookAt?.toISOString() ?? null,
      createdAt: integration.createdAt.toISOString(),
      updatedAt: integration.updatedAt.toISOString(),
    };
  }

  private isUniqueViolation(err: unknown): boolean {
    return Boolean(
      err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code?: string }).code === '23505',
    );
  }
}
