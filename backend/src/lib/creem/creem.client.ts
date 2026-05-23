import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type CreateCheckoutInput = {
  userId: string;
  email?: string;
  plan: string;
  productId: string;
  successUrl: string;
};

type CreemCheckoutResponse = {
  id?: string;
  checkout_url?: string;
  product?: string | { id?: string };
  product_id?: string;
  request_id?: string;
  status?: string;
};

@Injectable()
export class CreemClient {
  constructor(private readonly config: ConfigService) {}

  async createPremiumCheckout(input: CreateCheckoutInput) {
    const apiKey = this.config.get<string>("creem.apiKey")?.trim();

    if (!apiKey || !input.productId) {
      throw new InternalServerErrorException(
        "Creem checkout is not configured."
      );
    }

    const response = await fetch(`${this.baseUrl}/v1/checkouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        product_id: input.productId,
        request_id: `user:${input.userId}:${Date.now()}`,
        success_url: input.successUrl,
        customer: input.email ? { email: input.email } : undefined,
        metadata: {
          userId: input.userId,
          planType: input.plan
        }
      })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new BadGatewayException(`Creem checkout failed: ${message}`);
    }

    const checkout = (await response.json()) as CreemCheckoutResponse;

    if (!checkout.checkout_url) {
      throw new BadGatewayException("Creem did not return a checkout URL.");
    }

    return {
      id: checkout.id ?? null,
      url: checkout.checkout_url,
      productId: checkout.product_id ?? input.productId,
      status: checkout.status ?? "pending",
      testMode: this.config.get<boolean>("creem.testMode") ?? true
    };
  }

  async retrieveCheckout(checkoutId: string): Promise<{
    id: string | null;
    productId: string | null;
    requestId: string | null;
    status: string | null;
  }> {
    const apiKey = this.config.get<string>("creem.apiKey")?.trim();

    if (!apiKey) {
      throw new InternalServerErrorException(
        "Creem checkout is not configured."
      );
    }

    const params = new URLSearchParams({ checkout_id: checkoutId });
    const response = await fetch(
      `${this.baseUrl}/v1/checkouts?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "x-api-key": apiKey
        }
      }
    );

    if (!response.ok) {
      const message = await response.text();
      throw new BadGatewayException(`Creem checkout lookup failed: ${message}`);
    }

    const checkout = (await response.json()) as CreemCheckoutResponse;

    return {
      id: checkout.id ?? checkoutId,
      productId: this.extractProductId(checkout),
      requestId: checkout.request_id ?? null,
      status: checkout.status ?? null
    };
  }

  private extractProductId(checkout: CreemCheckoutResponse): string | null {
    if (typeof checkout.product === "string") return checkout.product;
    return checkout.product?.id ?? checkout.product_id ?? null;
  }

  private get baseUrl() {
    return this.config.get<boolean>("creem.testMode") === false
      ? "https://api.creem.io"
      : "https://test-api.creem.io";
  }
}
