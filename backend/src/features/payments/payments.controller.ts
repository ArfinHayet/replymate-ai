import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Logger,
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
    status?: string;
    request_id?: string;
    metadata?: {
      userId?: string;
      user_id?: string;
      planType?: string;
      plan?: string;
    };
    customer?: {
      metadata?: {
        userId?: string;
        user_id?: string;
        planType?: string;
        plan?: string;
      };
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

type ConfirmPaymentDto = {
  checkout_id?: string;
  order_id?: string | null;
  customer_id?: string | null;
  subscription_id?: string | null;
  product_id?: string;
  request_id?: string | null;
  signature?: string;
};

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

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
    const frontendUrl = this.getFrontendUrl();

    return this.creem.createPremiumCheckout({
      userId: user.id,
      email: user.email,
      plan: 'premium',
      successUrl: `${frontendUrl}/upgrade?checkout=success`,
    });
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  async confirmCheckout(@Req() req: Request, @Body() body: ConfirmPaymentDto) {
    const user = req.user as { id: string };
    const productId = this.config.get<string>('creem.productId');

    if (!productId || body.product_id !== productId) {
      throw new BadRequestException('Payment product does not match the premium plan.');
    }

    this.verifyRedirectSignature(body);

    const userId = this.extractUserIdFromRequestId(body.request_id);
    if (!userId || userId !== user.id) {
      throw new ForbiddenException('Payment confirmation does not belong to this user.');
    }

    const usage = await this.usageService.setCurrentPlan(user.id, 'premium');
    return { confirmed: true, usage };
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

    this.logger.log(`Creem webhook received: ${eventName ?? 'unknown'} for ${userId ?? 'unknown user'}`);

    if (!eventName || !userId) {
      this.logger.warn(`Creem webhook missing grant metadata: ${JSON.stringify(this.summarizeWebhook(body))}`);
      throw new BadRequestException('Webhook is missing event metadata.');
    }

    if (this.shouldGrantPremium(body)) {
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

  private verifyRedirectSignature(body: ConfirmPaymentDto) {
    const apiKey = this.config.get<string>('creem.apiKey');
    if (!apiKey) {
      throw new ForbiddenException('Creem API key is not configured.');
    }
    if (!body.signature || !body.checkout_id || !body.product_id) {
      throw new BadRequestException('Payment confirmation is missing required signature data.');
    }

    const signedPayload = Object.entries({
      checkout_id: body.checkout_id,
      customer_id: body.customer_id,
      order_id: body.order_id,
      product_id: body.product_id,
      request_id: body.request_id,
      subscription_id: body.subscription_id,
    })
      .filter(([, value]) => value != null && value !== '' && value !== 'null')
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    const digest = Buffer.from(createHmac('sha256', apiKey).update(signedPayload).digest('hex'), 'hex');
    const received = Buffer.from(body.signature, 'hex');

    if (digest.length !== received.length || !timingSafeEqual(digest, received)) {
      throw new ForbiddenException('Invalid Creem redirect signature.');
    }
  }

  private extractUserId(body: PaymentWebhookBody): string | undefined {
    const metadata = this.extractMetadata(body);
    if (metadata?.userId || metadata?.user_id) return metadata.userId ?? metadata.user_id;

    const requestId = body.object?.request_id;
    const userId = this.extractUserIdFromRequestId(requestId);
    if (userId) return userId;

    return undefined;
  }

  private extractPlan(body: PaymentWebhookBody): string {
    const metadata = this.extractMetadata(body);
    return metadata?.planType ?? metadata?.plan ?? 'premium';
  }

  private getFrontendUrl(): string {
    return (this.config.get<string>('frontendUrl') ?? 'http://localhost:5173').replace(/\/+$/, '');
  }

  private extractUserIdFromRequestId(requestId: string | null | undefined): string | undefined {
    if (requestId?.startsWith('user:')) {
      return requestId.split(':')[1];
    }
    return undefined;
  }

  private summarizeWebhook(body: PaymentWebhookBody) {
    return {
      eventType: body.eventType,
      objectType: body.object?.['object' as keyof NonNullable<PaymentWebhookBody['object']>],
      requestId: body.object?.request_id,
      hasObjectMetadata: Boolean(body.object?.metadata),
      hasCustomerMetadata: Boolean(body.object?.customer?.metadata),
      hasSubscriptionMetadata: Boolean(body.object?.subscription?.metadata),
    };
  }

  private extractMetadata(body: PaymentWebhookBody) {
    return body.object?.metadata ?? body.object?.customer?.metadata ?? body.object?.subscription?.metadata;
  }

  private shouldGrantPremium(body: PaymentWebhookBody): boolean {
    const eventName = body.eventType;
    if (['checkout.completed', 'subscription.active', 'subscription.paid'].includes(eventName ?? '')) {
      return true;
    }

    return eventName === 'subscription.update' && body.object?.status === 'active';
  }
}
