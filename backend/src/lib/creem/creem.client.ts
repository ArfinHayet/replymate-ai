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
  subscription?: string | { id?: string };
  subscription_id?: string;
  status?: string;
};

type CreemCancelSubscriptionResponse = {
  id?: string;
  status?: string;
  canceled_at?: string;
  current_period_end_date?: string;
};

type CreemCustomerResponse = {
  id?: string;
  email?: string;
};

type CreemTransactionResponse = {
  id?: string;
  subscription?: string | { id?: string };
  customer?: string | { id?: string };
  product?: string | { id?: string };
  status?: string;
  created_at?: string | number;
};

type CreemTransactionListResponse =
  | CreemTransactionResponse[]
  | {
      items?: CreemTransactionResponse[];
      data?: CreemTransactionResponse[];
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
    subscriptionId: string | null;
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
      subscriptionId: this.extractSubscriptionId(checkout),
      status: checkout.status ?? null
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<{
    id: string | null;
    status: string | null;
    canceledAt: string | null;
    currentPeriodEndDate: string | null;
  }> {
    const apiKey = this.config.get<string>("creem.apiKey")?.trim();

    if (!apiKey) {
      throw new InternalServerErrorException(
        "Creem subscription cancellation is not configured."
      );
    }

    const response = await fetch(
      `${this.baseUrl}/v1/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        }
      }
    );

    if (!response.ok) {
      const message = await response.text();
      if (
        response.status === 400 &&
        message.includes("Subscription cannot be canceled in state: canceled")
      ) {
        return {
          id: subscriptionId,
          status: "canceled",
          canceledAt: null,
          currentPeriodEndDate: null
        };
      }

      throw new BadGatewayException(
        `Creem subscription cancellation failed: ${message}`
      );
    }

    const subscription =
      (await response.json()) as CreemCancelSubscriptionResponse;

    return {
      id: subscription.id ?? subscriptionId,
      status: subscription.status ?? null,
      canceledAt: subscription.canceled_at ?? null,
      currentPeriodEndDate: subscription.current_period_end_date ?? null
    };
  }

  async retrieveCustomerByEmail(email: string): Promise<{
    id: string | null;
    email: string | null;
  }> {
    const apiKey = this.config.get<string>("creem.apiKey")?.trim();

    if (!apiKey) {
      throw new InternalServerErrorException(
        "Creem customer lookup is not configured."
      );
    }

    const params = new URLSearchParams({ email });
    const response = await fetch(
      `${this.baseUrl}/v1/customers?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "x-api-key": apiKey
        }
      }
    );

    if (!response.ok) {
      const message = await response.text();
      throw new BadGatewayException(`Creem customer lookup failed: ${message}`);
    }

    const customer = (await response.json()) as CreemCustomerResponse;

    return {
      id: customer.id ?? null,
      email: customer.email ?? null
    };
  }

  async findLatestSubscriptionIdForCustomer(input: {
    customerId: string;
    productId: string;
  }): Promise<string | null> {
    const apiKey = this.config.get<string>("creem.apiKey")?.trim();

    if (!apiKey) {
      throw new InternalServerErrorException(
        "Creem transaction lookup is not configured."
      );
    }

    const params = new URLSearchParams({
      customer_id: input.customerId,
      product_id: input.productId,
      page_number: "1",
      page_size: "10"
    });
    const response = await fetch(
      `${this.baseUrl}/v1/transactions/search?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "x-api-key": apiKey
        }
      }
    );

    if (!response.ok) {
      const message = await response.text();
      throw new BadGatewayException(
        `Creem transaction lookup failed: ${message}`
      );
    }

    const result = (await response.json()) as CreemTransactionListResponse;
    const transactions = Array.isArray(result)
      ? result
      : (result.items ?? result.data ?? []);

    return (
      transactions
        .filter((transaction) => transaction.status === "paid")
        .sort(
          (left, right) =>
            this.toTimestamp(right.created_at) - this.toTimestamp(left.created_at)
        )
        .map((transaction) => this.extractTransactionSubscriptionId(transaction))
        .find(Boolean) ?? null
    );
  }

  private extractProductId(checkout: CreemCheckoutResponse): string | null {
    if (typeof checkout.product === "string") return checkout.product;
    return checkout.product?.id ?? checkout.product_id ?? null;
  }

  private extractSubscriptionId(
    checkout: CreemCheckoutResponse
  ): string | null {
    if (typeof checkout.subscription === "string") return checkout.subscription;
    return checkout.subscription?.id ?? checkout.subscription_id ?? null;
  }

  private extractTransactionSubscriptionId(
    transaction: CreemTransactionResponse
  ): string | null {
    if (typeof transaction.subscription === "string") {
      return transaction.subscription;
    }
    return transaction.subscription?.id ?? null;
  }

  private toTimestamp(value: string | number | undefined): number {
    if (typeof value === "number") return value;
    if (!value) return 0;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  private get baseUrl() {
    return this.config.get<boolean>("creem.testMode") === false
      ? "https://api.creem.io"
      : "https://test-api.creem.io";
  }
}
