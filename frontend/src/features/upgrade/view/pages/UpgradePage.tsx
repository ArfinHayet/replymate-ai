import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, Loader2, Sparkles } from "lucide-react";
import { PageContent } from "@/components/layout/PageContent";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api";
import { apiRoutes } from "@/lib/apiRoutes";

type CheckoutResponse = {
  url: string;
};

type MessageUsage = {
  plan: {
    id: number;
    name: string;
    monthlyMessageLimit: number;
    webCrawlLimit?: number;
    pdfUploadLimit?: number;
    imageUploadLimit?: number;
  };
  periodStart: string;
  periodEnd: string;
  usedMessages: number;
  remainingMessages: number;
  creemSubscriptionId?: string | null;
  subscriptionStatus?: "active" | "canceled" | null;
};

type ConfirmCheckoutResponse = {
  confirmed: boolean;
  usage: MessageUsage;
};

type CancelSubscriptionResponse = {
  canceled: boolean;
  usage: MessageUsage;
};

type PaymentConfig = {
  configured: boolean;
};

type Plan = {
  id: number;
  name: string;
  monthlyMessageLimit: number;
  creemProductId?: string | null;
  webCrawlLimit: number;
  pdfUploadLimit: number;
  imageUploadLimit: number;
};

type ProfileResponse = {
  usage: MessageUsage;
};

function formatPlanName(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

export function UpgradePage() {
  const attemptedConfirmationRef = useRef<string | null>(null);
  const [checkoutPlanId, setCheckoutPlanId] = useState<number | null>(null);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<MessageUsage | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelledSubscription, setCancelledSubscription] = useState(false);
  const searchParams = useMemo(
    () => new URLSearchParams(window.location.search),
    [],
  );
  const checkoutSuccess =
    searchParams.has("checkout_id") && searchParams.has("signature");

  useEffect(() => {
    let cancelled = false;

    const loadUpgradeData = async () => {
      setPageLoading(true);

      try {
        const [configResponse, plansResponse, profileResponse] =
          await Promise.all([
            api.get<PaymentConfig>(apiRoutes.payments.config),
            api.get<Plan[]>(apiRoutes.plans.list),
            api.get<ProfileResponse>(apiRoutes.auth.me),
          ]);

        if (cancelled) return;
        setConfig(configResponse.data);
        setPlans(plansResponse.data);
        setUsage(profileResponse.data.usage);
      } catch {
        if (!cancelled) {
          setConfig(null);
          setError(
            "Could not load your plan details. Please refresh and try again.",
          );
        }
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    };

    void loadUpgradeData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!checkoutSuccess || confirmed || confirming) return;

    const confirmationKey = `${searchParams.get("checkout_id") ?? ""}:${searchParams.get("signature") ?? ""}`;
    if (attemptedConfirmationRef.current === confirmationKey) return;
    attemptedConfirmationRef.current = confirmationKey;

    const confirmCheckout = async () => {
      setConfirming(true);
      setError(null);

      try {
        const redirectParams = Object.fromEntries(searchParams.entries());
        const response = await api.post<ConfirmCheckoutResponse>(
          apiRoutes.payments.confirm,
          {
            raw_query: window.location.search,
            redirect_params: redirectParams,
            checkout: searchParams.get("checkout"),
            checkout_id: searchParams.get("checkout_id"),
            order_id: searchParams.get("order_id"),
            customer_id: searchParams.get("customer_id"),
            subscription_id: searchParams.get("subscription_id"),
            product_id: searchParams.get("product_id"),
            request_id: searchParams.get("request_id"),
            signature: searchParams.get("signature"),
          },
        );

        setConfirmed(response.data.confirmed);
        setUsage(response.data.usage);
        window.dispatchEvent(
          new CustomEvent("supportmate-usage-updated", {
            detail: response.data.usage,
          }),
        );
      } catch {
        setError(
          "Payment succeeded, but we could not confirm your plan update. Please contact support with your checkout ID.",
        );
      } finally {
        setConfirming(false);
      }
    };

    void confirmCheckout();
  }, [checkoutSuccess, confirmed, confirming, searchParams]);

  const startCheckout = async (plan: Plan) => {
    setCheckoutPlanId(plan.id);
    setError(null);

    try {
      const response = await api.post<CheckoutResponse>(
        apiRoutes.payments.checkout,
        {
          plan_id: plan.id,
        },
      );
      window.location.href = response.data.url;
    } catch {
      setError("Could not open the payment page. Please try again.");
      setCheckoutPlanId(null);
    }
  };

  const cancelSubscription = async () => {
    const shouldCancel = window.confirm(
      "Cancel your subscription? Your current plan will stay active until the end of this billing period.",
    );
    if (!shouldCancel) return;

    setCanceling(true);
    setError(null);
    setCancelledSubscription(false);

    try {
      const response = await api.post<CancelSubscriptionResponse>(
        apiRoutes.payments.cancelSubscription,
        {
          checkout_id: searchParams.get("checkout_id"),
          subscription_id: searchParams.get("subscription_id"),
        },
      );
      setUsage(response.data.usage);
      setCancelledSubscription(response.data.canceled);
      window.dispatchEvent(
        new CustomEvent("supportmate-usage-updated", {
          detail: response.data.usage,
        }),
      );
    } catch {
      setError(
        "Could not cancel your subscription. Please try again or contact support.",
      );
    } finally {
      setCanceling(false);
    }
  };

  const currentPlanName = usage ? formatPlanName(usage.plan.name) : "Loading";
  const currentPlanId = usage?.plan.id;
  const subscriptionStatus =
    usage?.subscriptionStatus ??
    (usage?.creemSubscriptionId ? "active" : null);
  const hasActiveSubscription =
    Boolean(usage?.creemSubscriptionId) && subscriptionStatus === "active";
  const hasCanceledSubscription = subscriptionStatus === "canceled";

  return (
    <div className="min-h-screen bg-rm-trip-surface">
      <PageHeader
        title="Upgrade"
        subtitle="Review your active plan and choose the right limits for your workspace."
      />
      <PageContent>
        {checkoutSuccess && (
          <div className="rounded-rm-trip-smooth border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {confirming
              ? "Payment completed. Updating your plan..."
              : confirmed
                ? "Payment completed. Your plan is active."
                : "Payment completed. We are updating your plan."}
          </div>
        )}

        {(cancelledSubscription || hasCanceledSubscription) && (
          <div className="rounded-rm-trip-smooth border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            Your subscription has been cancelled. Your current plan stays active
            until the end of this billing period.
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4 md:grid-cols-2">
            {pageLoading
              ? Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={index}
                    className="min-h-[300px] animate-pulse rounded-rm-trip-smooth border border-gray-100 bg-white p-6 shadow-rm-trip-card"
                  />
                ))
              : plans.map((plan) => {
                  const isActive = currentPlanId === plan.id;
                  const isPaid = Boolean(plan.creemProductId?.trim());
                  const isStarting = checkoutPlanId === plan.id;
                  const features = [
                    `${plan.monthlyMessageLimit.toLocaleString()} AI messages every 30 days`,
                    `${plan.webCrawlLimit.toLocaleString()} web crawls`,
                    `${plan.pdfUploadLimit.toLocaleString()} PDF uploads`,
                    `${plan.imageUploadLimit.toLocaleString()} image uploads`,
                  ];

                  return (
                    <article
                      key={plan.id}
                      className="flex min-h-[300px] flex-col rounded-rm-trip-smooth border border-gray-100 bg-white p-6 shadow-rm-trip-card"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="inline-flex items-center gap-2 rounded-rm-trip-smooth bg-blue-50 px-3 py-1 text-xs font-semibold text-rm-trip-brand">
                            <Sparkles className="h-3.5 w-3.5" />
                            {formatPlanName(plan.name)}
                          </div>
                          <h2 className="mt-4 font-rm-trip-heading text-2xl font-bold text-rm-trip-text">
                            {plan.monthlyMessageLimit.toLocaleString()} messages
                          </h2>
                        </div>

                        {isActive && (
                          <button
                            type="button"
                            disabled
                            className="inline-flex shrink-0 items-center justify-center rounded-rm-trip-smooth bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"
                          >
                            Active
                          </button>
                        )}
                      </div>

                      <div className="mt-6 grid gap-3">
                        {features.map((item) => (
                          <div
                            key={item}
                            className="flex min-w-0 items-center gap-3 rounded-rm-trip-smooth bg-gray-50 px-4 py-3 text-sm font-semibold text-rm-trip-text"
                          >
                            <Check className="h-4 w-4 shrink-0 text-rm-trip-brand" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-auto pt-6">
                        {isActive ? null : isPaid ? (
                          <button
                            type="button"
                            onClick={() => void startCheckout(plan)}
                            disabled={
                              pageLoading ||
                              checkoutPlanId !== null ||
                              config?.configured === false
                            }
                            className="inline-flex w-full items-center justify-center gap-2 rounded-rm-trip-smooth bg-rm-trip-brand px-4 py-3 text-sm font-semibold text-white shadow-rm-trip-card transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isStarting && (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            {isStarting ? "Opening..." : "Start"}
                          </button>
                        ) : (
                          <div className="rounded-rm-trip-smooth bg-gray-50 px-4 py-3 text-center text-sm font-semibold text-rm-trip-text-muted">
                            Included
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
          </div>

          <aside className="rounded-rm-trip-smooth border border-gray-100 bg-white p-6 shadow-rm-trip-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-rm-trip-text-muted">
              Current Plan
            </p>
            <div className="mt-3 flex items-end gap-1">
              <span className="font-rm-trip-heading text-4xl font-bold text-rm-trip-text">
                {currentPlanName}
              </span>
            </div>
            {usage && (
              <p className="mt-3 text-sm leading-6 text-rm-trip-text-muted">
                {usage.usedMessages.toLocaleString()} of{" "}
                {usage.plan.monthlyMessageLimit.toLocaleString()} messages used.
              </p>
            )}

            {usage && (
              <div className="mt-5 grid gap-3">
                <div className="rounded-rm-trip-smooth bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rm-trip-text-muted">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Started
                  </div>
                  <p className="mt-1 text-sm font-semibold text-rm-trip-text">
                    {formatDate(usage.periodStart)}
                  </p>
                </div>
                <div className="rounded-rm-trip-smooth bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rm-trip-text-muted">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {hasCanceledSubscription ? "Active until" : "Renews"}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-rm-trip-text">
                    {formatDate(usage.periodEnd)}
                  </p>
                </div>
                {hasActiveSubscription && !cancelledSubscription && (
                  <button
                    type="button"
                    onClick={() => void cancelSubscription()}
                    disabled={canceling || pageLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-rm-trip-smooth border border-red-100 bg-white px-4 py-3 text-sm font-semibold text-rm-trip-state-error transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {canceling && <Loader2 className="h-4 w-4 animate-spin" />}
                    {canceling ? "Cancelling..." : "Cancel subscription"}
                  </button>
                )}
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm font-semibold text-rm-trip-state-error">
                {error}
              </p>
            )}

            {config?.configured === false && (
              <p className="mt-3 text-xs font-medium leading-5 text-rm-trip-text-muted">
                Plan changes are temporarily unavailable.
              </p>
            )}
          </aside>
        </section>
      </PageContent>
    </div>
  );
}
