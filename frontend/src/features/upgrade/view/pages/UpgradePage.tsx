import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { PageContent } from "@/components/layout/PageContent";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api";
import { apiRoutes } from "@/lib/apiRoutes";

type CheckoutResponse = {
  url: string;
  testMode: boolean;
};

type MessageUsage = {
  plan: {
    id: number;
    name: string;
    monthlyLimit: number;
  };
  periodStart: string;
  periodEnd: string;
  usedMessages: number;
  remainingMessages: number;
};

type ConfirmCheckoutResponse = {
  confirmed: boolean;
  usage: MessageUsage;
};

type PaymentConfig = {
  configured: boolean;
  provider: string;
  testMode: boolean;
};

export function UpgradePage() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const checkoutSuccess = searchParams.get("checkout") === "success";

  useEffect(() => {
    let cancelled = false;

    api
      .get<PaymentConfig>(apiRoutes.payments.config)
      .then((response) => {
        if (!cancelled) setConfig(response.data);
      })
      .catch(() => {
        if (!cancelled) setConfig(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!checkoutSuccess || confirmed || confirming) return;

    const confirmCheckout = async () => {
      setConfirming(true);
      setError(null);

      try {
        const response = await api.post<ConfirmCheckoutResponse>(apiRoutes.payments.confirm, {
          checkout_id: searchParams.get("checkout_id"),
          order_id: searchParams.get("order_id"),
          customer_id: searchParams.get("customer_id"),
          subscription_id: searchParams.get("subscription_id"),
          product_id: searchParams.get("product_id"),
          request_id: searchParams.get("request_id"),
          signature: searchParams.get("signature"),
        });

        setConfirmed(response.data.confirmed);
        window.dispatchEvent(new CustomEvent("supportmate-usage-updated", { detail: response.data.usage }));
      } catch {
        setError("Payment succeeded, but we could not confirm the plan update. Please contact support with your checkout ID.");
      } finally {
        setConfirming(false);
      }
    };

    void confirmCheckout();
  }, [checkoutSuccess, confirmed, confirming, searchParams]);

  const startCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<CheckoutResponse>(apiRoutes.payments.checkout);
      window.location.href = response.data.url;
    } catch {
      setError("Could not start checkout. Please check your payment configuration and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-rm-trip-surface">
      <PageHeader title="Upgrade" subtitle="Move to Premium for a larger monthly AI message allowance." />
      <PageContent>
        {checkoutSuccess && (
          <div className="rounded-rm-trip-smooth border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {confirming
              ? "Checkout completed. Confirming your Premium plan..."
              : confirmed
                ? "Checkout completed. Your Premium plan is active."
                : "Checkout completed. Your plan will update as soon as Creem sends the payment webhook."}
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-rm-trip-smooth border border-gray-100 bg-white p-6 shadow-rm-trip-card">
            <div className="inline-flex items-center gap-2 rounded-rm-trip-smooth bg-blue-50 px-3 py-1 text-xs font-semibold text-rm-trip-brand">
              <Sparkles className="h-3.5 w-3.5" />
              Premium
            </div>
            <h2 className="mt-4 font-rm-trip-heading text-2xl font-bold text-rm-trip-text">2,000 AI messages per month</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-rm-trip-text-muted">
              Upgrade your workspace when the free plan starts feeling tight. Checkout is handled securely by Creem.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {["Higher monthly message limit", "Hosted secure checkout", "Test-mode friendly integration", "Webhook-based plan activation"].map((item) => (
                <div key={item} className="flex min-w-0 items-center gap-3 rounded-rm-trip-smooth bg-gray-50 px-4 py-3 text-sm font-semibold text-rm-trip-text">
                  <Check className="h-4 w-4 shrink-0 text-rm-trip-brand" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-rm-trip-smooth border border-gray-100 bg-white p-6 shadow-rm-trip-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-rm-trip-text-muted">Premium Plan</p>
            <div className="mt-3 flex items-end gap-1">
              <span className="font-rm-trip-heading text-4xl font-bold text-rm-trip-text">Upgrade</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-rm-trip-text-muted">
              Configure your Creem API key and premium product ID in the backend environment to enable checkout.
            </p>

            {config?.testMode && (
              <div className="mt-4 rounded-rm-trip-smooth border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                Creem test mode is enabled.
              </div>
            )}

            {error && <p className="mt-4 text-sm font-semibold text-rm-trip-state-error">{error}</p>}

            <button
              type="button"
              onClick={() => void startCheckout()}
              disabled={loading || config?.configured === false}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-rm-trip-smooth bg-rm-trip-brand px-4 py-3 text-sm font-semibold text-white shadow-rm-trip-card transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Start checkout
            </button>

            {config?.configured === false && (
              <p className="mt-3 text-xs font-medium leading-5 text-rm-trip-text-muted">
                Missing Creem API key or premium product ID.
              </p>
            )}
          </aside>
        </section>
      </PageContent>
    </div>
  );
}
