import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsageService } from '../usage/usage.service';
import { CreemClient } from '../../lib/creem/creem.client';

type RawBodyRequest = Request & { rawBody?: Buffer };

type PaymentWebhookBody = {
  eventType?: string;
  object?: {
    request_id?: string;
    metadata?: {
      userId?: string;
      user_id?: string;
      planType?: string;
      plan?: string;
    };
    subscription?: {
      metadata?: {
        userId?: string;
        user_id?: string;
        planType?: string;
        plan?: string;
      };
    };
  };
};

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly config: ConfigService,
    private readonly creem: CreemClient,
    private readonly usageService: UsageService,
  ) {}

  @Get('config')
  getConfig() {
    return {
      provider: 'creem',
      testMode: this.config.get<boolean>('creem.testMode') ?? true,
      configured: Boolean(
        this.config.get<string>('creem.apiKey') &&
          this.config.get<string>('creem.productId'),
      ),
    };
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckout(@Req() req: Request) {
    const user = req.user as {
      id: string;
      email?: string;
      user_metadata?: { full_name?: string; name?: string };
    };
    const frontendUrl = this.config.get<string>('frontendUrl') ?? 'http://localhost:5173';

    return this.creem.createPremiumCheckout({
      userId: user.id,
      email: user.email,
      plan: 'premium',
      successUrl: `${frontendUrl}/upgrade?checkout=success`,
    });
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest,
    @Body() body: PaymentWebhookBody,
    @Headers('creem-signature') signature: string | undefined,
  ) {
    this.verifySignature(req.rawBody, signature);

    const eventName = body.eventType;
    const userId = this.extractUserId(body);
    const plan = this.extractPlan(body);

    if (!eventName || !userId) {
      throw new BadRequestException('Webhook is missing event metadata.');
    }

    if (['checkout.completed', 'subscription.active', 'subscription.paid'].includes(eventName)) {
      await this.usageService.setCurrentPlan(userId, plan);
    }

    if (['subscription.canceled', 'subscription.expired'].includes(eventName)) {
      await this.usageService.setCurrentPlan(userId, 'free');
    }

    return { received: true };
  }

  private verifySignature(rawBody: Buffer | undefined, signature: string | undefined) {
    const secret = this.config.get<string>('creem.webhookSecret');
    if (!secret) {
      throw new ForbiddenException('Creem webhook signing secret is not configured.');
    }
    if (!rawBody || !signature) {
      throw new ForbiddenException('Missing Creem webhook signature.');
    }

    const digest = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'), 'hex');
    const received = Buffer.from(signature, 'hex');

    if (digest.length !== received.length || !timingSafeEqual(digest, received)) {
      throw new ForbiddenException('Invalid Creem webhook signature.');
    }
  }

  private extractUserId(body: PaymentWebhookBody): string | undefined {
    const metadata = body.object?.metadata ?? body.object?.subscription?.metadata;
    if (metadata?.userId || metadata?.user_id) return metadata.userId ?? metadata.user_id;

    const requestId = body.object?.request_id;
    if (requestId?.startsWith('user:')) {
      return requestId.split(':')[1];
    }

    return undefined;
  }

  private extractPlan(body: PaymentWebhookBody): string {
    const metadata = body.object?.metadata ?? body.object?.subscription?.metadata;
    return metadata?.planType ?? metadata?.plan ?? 'premium';
  }
}
