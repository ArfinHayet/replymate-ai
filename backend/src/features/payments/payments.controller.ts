import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  InternalServerErrorException,
  Logger,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UsageService } from "../usage/usage.service";
import { CreemClient } from "../../lib/creem/creem.client";

type RawBodyRequest = Request & { rawBody?: Buffer };

type PaymentWebhookBody = {
  eventType?: string;
  object?: {
    id?: string;
    status?: string;
    request_id?: string;
    subscription_id?: string;
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
    subscription?:
      | string
      | {
          id?: string;
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
  raw_query?: string | null;
  redirect_params?: Record<string, string | null | undefined>;
  checkout?: string | null;
  checkout_id?: string;
  order_id?: string | null;
  customer_id?: string | null;
  subscription_id?: string | null;
  product_id?: string;
  request_id?: string | null;
  signature?: string;
};

type CreateCheckoutDto = {
  plan_id?: number | string | null;
  planId?: number | string | null;
};

type CancelSubscriptionDto = {
  checkout_id?: string | null;
  subscription_id?: string | null;
};

@Controller("payments")
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly creem: CreemClient,
    private readonly usageService: UsageService
  ) {}

  @Get("config")
  async getConfig() {
    const plans = await this.usageService.findPlans();

    return {
      provider: "creem",
      testMode: this.config.get<boolean>("creem.testMode") ?? true,
      configured: Boolean(
        this.config.get<string>("creem.apiKey") &&
        plans.some((plan) => plan.creemProductId?.trim())
      )
    };
  }

  @Post("checkout")
  @UseGuards(JwtAuthGuard)
  async createCheckout(@Req() req: Request, @Body() body: CreateCheckoutDto) {
    const user = req.user as {
      id: string;
      email?: string;
      user_metadata?: { full_name?: string; name?: string };
    };
    const frontendUrl = this.getFrontendUrl();
    const plan = await this.findCheckoutPlan(body);
    const productId = this.getPlanProductId(plan.creemProductId);

    return this.creem.createPremiumCheckout({
      userId: user.id,
      email: user.email,
      plan: plan.name,
      productId,
      successUrl: `${frontendUrl}/upgrade`
    });
  }

  @Post("confirm")
  @UseGuards(JwtAuthGuard)
  async confirmCheckout(@Req() req: Request, @Body() body: ConfirmPaymentDto) {
    const user = req.user as { id: string };
    const plan = await this.findPlanByProductId(body.product_id);
    const productId = this.getPlanProductId(plan.creemProductId);

    if (body.product_id !== productId) {
      throw new BadRequestException(
        "Payment product does not match an available plan."
      );
    }

    const hasValidRedirectSignature = this.verifyRedirectSignature(body);

    const userId = this.extractUserIdFromRequestId(body.request_id);
    if (!userId || userId !== user.id) {
      throw new ForbiddenException(
        "Payment confirmation does not belong to this user."
      );
    }

    const redirectSubscriptionId = this.normalizeId(body.subscription_id);
    const checkout =
      !hasValidRedirectSignature || !redirectSubscriptionId
        ? await this.verifyCheckoutWithCreem(
            body.checkout_id,
            user.id,
            productId
          )
        : null;
    const subscriptionId =
      redirectSubscriptionId ?? checkout?.subscriptionId ?? null;
    const usage = await this.usageService.setCurrentPlan(user.id, plan.name, {
      creemSubscriptionId: subscriptionId
    });
    return { confirmed: true, usage };
  }

  @Post("subscription/cancel")
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(
    @Req() req: Request,
    @Body() body: CancelSubscriptionDto
  ) {
    const user = req.user as { id: string; email?: string };
    const currentUsage = await this.usageService.ensureCurrentUsage(user.id);
    const productId = this.normalizeId(currentUsage.plan.creemProductId);
    const storedSubscriptionId =
      await this.usageService.findCurrentSubscriptionId(user.id);
    let subscriptionId = storedSubscriptionId;

    if (!subscriptionId && body.checkout_id) {
      if (!productId) {
        throw new BadRequestException(
          "No active subscription is linked to this account."
        );
      }
      const checkout = await this.verifyCheckoutWithCreem(
        body.checkout_id,
        user.id,
        productId
      );
      subscriptionId =
        checkout.subscriptionId ?? this.normalizeId(body.subscription_id);
    }

    if (!subscriptionId && user.email && productId) {
      const customer = await this.creem.retrieveCustomerByEmail(user.email);
      if (customer.id) {
        subscriptionId = await this.creem.findLatestSubscriptionIdForCustomer({
          customerId: customer.id,
          productId
        });
      }
    }

    if (!subscriptionId) {
      throw new BadRequestException(
        "No active Creem subscription is linked to this account."
      );
    }

    const subscription = await this.creem.cancelSubscription(subscriptionId);
    const usage = await this.usageService.ensureCurrentUsage(user.id);

    return { canceled: true, subscription, usage };
  }

  @Post("webhook")
  async handleWebhook(
    @Req() req: RawBodyRequest,
    @Body() body: PaymentWebhookBody,
    @Headers("creem-signature") signature: string | undefined
  ) {
    this.verifySignature(req.rawBody, signature);

    const eventName = body.eventType;
    const userId = this.extractUserId(body);
    const plan = this.extractPlan(body);

    this.logger.log(
      `Creem webhook received: ${eventName ?? "unknown"} for ${userId ?? "unknown user"}`
    );

    if (!eventName || !userId) {
      this.logger.warn(
        `Creem webhook missing grant metadata: ${JSON.stringify(this.summarizeWebhook(body))}`
      );
      throw new BadRequestException("Webhook is missing event metadata.");
    }

    if (this.shouldGrantPremium(body)) {
      await this.usageService.setCurrentPlan(userId, plan, {
        creemSubscriptionId: this.extractSubscriptionId(body)
      });
    }

    if (eventName === "subscription.expired") {
      await this.usageService.setCurrentPlan(userId, "free", {
        creemSubscriptionId: null
      });
    }

    return { received: true };
  }

  private verifySignature(
    rawBody: Buffer | undefined,
    signature: string | undefined
  ) {
    const secret = this.config.get<string>("creem.webhookSecret")?.trim();
    if (!secret) {
      throw new ForbiddenException(
        "Creem webhook signing secret is not configured."
      );
    }
    if (!rawBody || !signature) {
      throw new ForbiddenException("Missing Creem webhook signature.");
    }

    const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
    const received = signature.trim();

    if (!this.secureCompare(digest, received)) {
      throw new ForbiddenException("Invalid Creem webhook signature.");
    }
  }

  private verifyRedirectSignature(body: ConfirmPaymentDto): boolean {
    const apiKey = this.config.get<string>("creem.apiKey")?.trim();
    if (!apiKey) {
      throw new ForbiddenException("Creem API key is not configured.");
    }
    if (!body.signature || !body.checkout_id || !body.product_id) {
      throw new BadRequestException(
        "Payment confirmation is missing required signature data."
      );
    }

    const signature = body.signature;
    const rawQueryPayload = this.buildRawQueryPayload(body.raw_query);
    const paymentParams = {
      checkout: body.checkout,
      checkout_id: body.checkout_id,
      customer_id: body.customer_id,
      order_id: body.order_id,
      product_id: body.product_id,
      request_id: body.request_id,
      subscription_id: body.subscription_id
    };
    const redirectParams = body.redirect_params ?? {};
    const paymentPayload = this.buildRedirectPayload(paymentParams);
    const encodedPaymentPayload = this.buildRedirectPayload(
      paymentParams,
      true
    );
    const redirectPayload = this.buildRedirectPayload(redirectParams);
    const encodedRedirectPayload = this.buildRedirectPayload(
      redirectParams,
      true
    );

    const ampersandPayloads = [
      rawQueryPayload,
      redirectPayload,
      encodedRedirectPayload,
      paymentPayload,
      encodedPaymentPayload,
      this.omitRedirectKey(paymentPayload, "checkout"),
      this.omitRedirectKey(encodedPaymentPayload, "checkout")
    ].filter(Boolean);
    const pipePayloads = [
      this.buildLegacyRedirectPayload(redirectParams, apiKey),
      this.buildLegacyRedirectPayload(paymentParams, apiKey),
      this.buildLegacyRedirectPayload(
        this.omitRedirectParam(paymentParams, "checkout"),
        apiKey
      )
    ].filter(Boolean);
    const signedPayloads = [...ampersandPayloads, ...pipePayloads];
    const uniquePayloads = [...new Set(signedPayloads)];
    const hasValidSignature =
      ampersandPayloads.some((payload) =>
        this.secureCompare(
          createHmac("sha256", apiKey).update(payload).digest("hex"),
          signature
        )
      ) ||
      pipePayloads.some((payload) =>
        this.secureCompare(
          createHash("sha256").update(payload).digest("hex"),
          signature
        )
      );

    if (!hasValidSignature) {
      this.logger.warn(
        `Invalid Creem redirect signature. ${JSON.stringify({
          keyFingerprint: this.fingerprint(apiKey),
          productId: body.product_id,
          redirectKeys: Object.keys(body.redirect_params ?? {}).sort(),
          hasRawQuery: Boolean(body.raw_query),
          candidatePayloads: uniquePayloads.map((payload) => ({
            keys: payload
              .split(/[&|]/)
              .filter(Boolean)
              .map((entry) => entry.split("=")[0]),
            sha256: this.fingerprint(payload)
          }))
        })}`
      );
      return false;
    }

    return true;
  }

  private buildRedirectPayload(
    params: Record<string, string | null | undefined>,
    encodeValues = false
  ): string {
    return Object.entries(params)
      .filter(
        ([key, value]) =>
          key !== "signature" &&
          value != null &&
          value !== "" &&
          value !== "null"
      )
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, value]) =>
          `${key}=${encodeValues ? encodeURIComponent(value as string) : value}`
      )
      .join("&");
  }

  private buildLegacyRedirectPayload(
    params: Record<string, string | null | undefined>,
    apiKey: string
  ): string {
    const entries = Object.entries(params)
      .filter(
        ([key, value]) =>
          key !== "signature" &&
          value != null &&
          value !== "" &&
          value !== "null"
      )
      .map(([key, value]) => `${key}=${value}`);

    if (!entries.length) return "";

    return [...entries, `salt=${apiKey}`].join("|");
  }

  private omitRedirectKey(payload: string, key: string): string {
    return payload
      .split("&")
      .filter((entry) => !entry.startsWith(`${key}=`))
      .join("&");
  }

  private omitRedirectParam<
    T extends Record<string, string | null | undefined>
  >(params: T, key: keyof T): Record<string, string | null | undefined> {
    const { [key]: _omitted, ...rest } = params;
    return rest;
  }

  private buildRawQueryPayload(rawQuery: string | null | undefined): string {
    if (!rawQuery) return "";

    const query = rawQuery.startsWith("?") ? rawQuery.slice(1) : rawQuery;
    return query
      .split("&")
      .filter(Boolean)
      .filter((entry) => {
        const [rawKey, ...rawValueParts] = entry.split("=");
        const key = decodeURIComponent(rawKey);
        const value = rawValueParts.join("=");
        const decodedValue = decodeURIComponent(value.replace(/\+/g, " "));
        return (
          key !== "signature" && decodedValue !== "" && decodedValue !== "null"
        );
      })
      .sort((left, right) => {
        const leftKey = decodeURIComponent(left.split("=")[0]);
        const rightKey = decodeURIComponent(right.split("=")[0]);
        return leftKey.localeCompare(rightKey);
      })
      .join("&");
  }

  private secureCompare(expected: string, received: string): boolean {
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);
    return (
      expectedBuffer.length === receivedBuffer.length &&
      timingSafeEqual(expectedBuffer, receivedBuffer)
    );
  }

  private fingerprint(value: string): string {
    return createHash("sha256").update(value).digest("hex").slice(0, 12);
  }

  private async verifyCheckoutWithCreem(
    checkoutId: string | undefined,
    userId: string,
    productId: string
  ): Promise<{
    id: string | null;
    productId: string | null;
    requestId: string | null;
    subscriptionId: string | null;
    status: string | null;
  }> {
    if (!checkoutId) {
      throw new BadRequestException(
        "Payment confirmation is missing checkout ID."
      );
    }

    const checkout = await this.creem.retrieveCheckout(checkoutId);
    if (checkout.productId !== productId) {
      throw new BadRequestException(
        "Payment product does not match an available plan."
      );
    }

    const checkoutUserId = this.extractUserIdFromRequestId(checkout.requestId);
    if (!checkoutUserId || checkoutUserId !== userId) {
      throw new ForbiddenException(
        "Payment confirmation does not belong to this user."
      );
    }

    if (!this.isPaidCheckoutStatus(checkout.status)) {
      throw new ForbiddenException("Payment checkout is not completed yet.");
    }

    return checkout;
  }

  private async findCheckoutPlan(body: CreateCheckoutDto) {
    const planId = Number(body.plan_id ?? body.planId);
    if (!Number.isInteger(planId)) {
      throw new BadRequestException("Checkout is missing a valid plan.");
    }

    const plan = await this.usageService.findPlan(planId);
    if (!plan.creemProductId?.trim()) {
      throw new BadRequestException("This plan is not available for checkout.");
    }

    return plan;
  }

  private async findPlanByProductId(productId: string | null | undefined) {
    const normalizedProductId = this.normalizeId(productId);
    if (!normalizedProductId) {
      throw new BadRequestException(
        "Payment confirmation is missing product details."
      );
    }

    const plans = await this.usageService.findPlans();
    const plan = plans.find(
      (item) => item.creemProductId?.trim() === normalizedProductId
    );
    if (!plan) {
      throw new BadRequestException(
        "Payment product does not match an available plan."
      );
    }

    return plan;
  }

  private isPaidCheckoutStatus(status: string | null): boolean {
    return ["completed", "paid", "active", "succeeded"].includes(status ?? "");
  }

  private extractUserId(body: PaymentWebhookBody): string | undefined {
    const metadata = this.extractMetadata(body);
    if (metadata?.userId || metadata?.user_id)
      return metadata.userId ?? metadata.user_id;

    const requestId = body.object?.request_id;
    const userId = this.extractUserIdFromRequestId(requestId);
    if (userId) return userId;

    return undefined;
  }

  private extractPlan(body: PaymentWebhookBody): string {
    const metadata = this.extractMetadata(body);
    return metadata?.planType ?? metadata?.plan ?? "premium";
  }

  private extractSubscriptionId(body: PaymentWebhookBody): string | null {
    const subscription = body.object?.subscription;
    if (typeof subscription === "string") return this.normalizeId(subscription);

    return (
      this.normalizeId(subscription?.id) ??
      this.normalizeId(body.object?.subscription_id) ??
      (body.eventType?.startsWith("subscription.")
        ? this.normalizeId(body.object?.id)
        : null)
    );
  }

  private normalizeId(id: string | null | undefined): string | null {
    const normalized = id?.trim();
    return normalized && normalized !== "null" ? normalized : null;
  }

  private getFrontendUrl(): string {
    return (
      this.config.get<string>("frontendUrl") ?? "http://localhost:5173"
    ).replace(/\/+$/, "");
  }

  private getPlanProductId(productId: string | null | undefined): string {
    const normalized = productId?.trim();
    if (!normalized) {
      throw new InternalServerErrorException(
        "Plan payment product ID is not configured."
      );
    }
    return normalized;
  }

  private extractUserIdFromRequestId(
    requestId: string | null | undefined
  ): string | undefined {
    if (requestId?.startsWith("user:")) {
      return requestId.split(":")[1];
    }
    return undefined;
  }

  private summarizeWebhook(body: PaymentWebhookBody) {
    const subscription = body.object?.subscription;
    return {
      eventType: body.eventType,
      objectType:
        body.object?.[
          "object" as keyof NonNullable<PaymentWebhookBody["object"]>
        ],
      requestId: body.object?.request_id,
      hasObjectMetadata: Boolean(body.object?.metadata),
      hasCustomerMetadata: Boolean(body.object?.customer?.metadata),
      hasSubscriptionMetadata: Boolean(
        typeof subscription === "string" ? false : subscription?.metadata
      )
    };
  }

  private extractMetadata(body: PaymentWebhookBody) {
    const subscription = body.object?.subscription;
    return (
      body.object?.metadata ??
      body.object?.customer?.metadata ??
      (typeof subscription === "string" ? undefined : subscription?.metadata)
    );
  }

  private shouldGrantPremium(body: PaymentWebhookBody): boolean {
    const eventName = body.eventType;
    if (
      [
        "checkout.completed",
        "subscription.active",
        "subscription.paid"
      ].includes(eventName ?? "")
    ) {
      return true;
    }

    return (
      eventName === "subscription.update" && body.object?.status === "active"
    );
  }
}
