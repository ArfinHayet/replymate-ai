import { BadGatewayException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type CreateCheckoutInput = {
  userId: string;
  email?: string;
  plan: string;
  successUrl: string;
};

type CreemCheckoutResponse = {
  id?: string;
  checkout_url?: string;
  product_id?: string;
  status?: string;
};

@Injectable()
export class CreemClient {
  constructor(private readonly config: ConfigService) {}

  async createPremiumCheckout(input: CreateCheckoutInput) {
    const apiKey = this.config.get<string>('creem.apiKey');
    const productId = this.config.get<string>('creem.productId');

    if (!apiKey || !productId) {
      throw new InternalServerErrorException('Creem checkout is not configured.');
    }

    const response = await fetch(`${this.baseUrl}/v1/checkouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        product_id: productId,
        request_id: `user:${input.userId}:${Date.now()}`,
        success_url: input.successUrl,
        customer: input.email ? { email: input.email } : undefined,
        metadata: {
          userId: input.userId,
          planType: input.plan,
        },
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new BadGatewayException(`Creem checkout failed: ${message}`);
    }

    const checkout = (await response.json()) as CreemCheckoutResponse;

    if (!checkout.checkout_url) {
      throw new BadGatewayException('Creem did not return a checkout URL.');
    }

    return {
      id: checkout.id ?? null,
      url: checkout.checkout_url,
      productId: checkout.product_id ?? productId,
      status: checkout.status ?? 'pending',
      testMode: this.config.get<boolean>('creem.testMode') ?? true,
    };
  }

  private get baseUrl() {
    return this.config.get<boolean>('creem.testMode') === false
      ? 'https://api.creem.io'
      : 'https://test-api.creem.io';
  }
}
