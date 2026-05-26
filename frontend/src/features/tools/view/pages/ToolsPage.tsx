import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Bot, ExternalLink, Plane, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { PageContent } from "@/components/layout/PageContent";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api";
import { apiRoutes } from "@/lib/apiRoutes";

type ChatToolKey = "flight_search" | "live_agent_contact";

type ChatToolConfig = {
  toolKey: ChatToolKey;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

type ToolFormState = {
  flightEnabled: boolean;
  oneWayTemplateUrl: string;
  roundTripTemplateUrl: string;
  multiCityTemplateUrl: string;
  liveAgentEnabled: boolean;
  liveAgentRedirectUrl: string;
};

const emptyForm: ToolFormState = {
  flightEnabled: false,
  oneWayTemplateUrl: "",
  roundTripTemplateUrl: "",
  multiCityTemplateUrl: "",
  liveAgentEnabled: false,
  liveAgentRedirectUrl: "",
};

export function ToolsPage() {
  const [form, setForm] = useState<ToolFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ChatToolKey | null>(null);

  const loadTools = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<ChatToolConfig[]>(apiRoutes.chatTools.list);
      setForm(toFormState(response.data));
    } catch {
      toast.error("Failed to load tools");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTools();
  }, [loadTools]);

  const updateForm = (patch: Partial<ToolFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const saveFlightSearch = async () => {
    try {
      setSaving("flight_search");
      await api.put(apiRoutes.chatTools.byKey("flight_search"), {
        enabled: form.flightEnabled,
        config: {
          oneWayTemplateUrl: form.oneWayTemplateUrl,
          roundTripTemplateUrl: form.roundTripTemplateUrl,
          multiCityTemplateUrl: form.multiCityTemplateUrl,
        },
      });
      toast.success("Flight search tool saved");
      await loadTools();
    } catch (error: unknown) {
      toast.error(readApiError(error, "Failed to save flight search tool"));
    } finally {
      setSaving(null);
    }
  };

  const saveLiveAgent = async () => {
    try {
      setSaving("live_agent_contact");
      await api.put(apiRoutes.chatTools.byKey("live_agent_contact"), {
        enabled: form.liveAgentEnabled,
        config: {
          redirectUrl: form.liveAgentRedirectUrl,
        },
      });
      toast.success("Live agent tool saved");
      await loadTools();
    } catch (error: unknown) {
      toast.error(readApiError(error, "Failed to save live agent tool"));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-rm-trip-surface">
      <PageHeader
        title="Tools"
        subtitle="Enable prebuilt chat actions that can redirect widget visitors."
      >
        <button
          type="button"
          onClick={() => void loadTools()}
          disabled={loading}
          className="flex items-center gap-2 rounded-rm-trip-smooth border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-rm-trip-text-muted shadow-sm transition-all hover:border-gray-300 hover:text-rm-trip-text disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </PageHeader>

      <PageContent>
        <div className="grid gap-4 xl:grid-cols-2">
          <ToolCard
            icon={<Plane className="h-5 w-5" />}
            title="Flight Search"
            description="Build a flight search URL from a visitor's route, date, passengers, and cabin class."
            enabled={form.flightEnabled}
            onEnabledChange={(flightEnabled) => updateForm({ flightEnabled })}
            saving={saving === "flight_search"}
            onSave={() => void saveFlightSearch()}
          >
            <UrlField
              label="One-way sample URL"
              value={form.oneWayTemplateUrl}
              onChange={(oneWayTemplateUrl) => updateForm({ oneWayTemplateUrl })}
              placeholder="https://template1.myota.xyz/flightlist?adult=2&trips=DAC,ZYL,2026-05-29"
            />
            <UrlField
              label="Round-trip sample URL"
              value={form.roundTripTemplateUrl}
              onChange={(roundTripTemplateUrl) => updateForm({ roundTripTemplateUrl })}
              placeholder="https://template1.myota.xyz/flightlist?adult=1&trips=DAC,KUL,2026-05-29|KUL,DAC,2026-06-05"
            />
            <UrlField
              label="Multicity sample URL"
              value={form.multiCityTemplateUrl}
              onChange={(multiCityTemplateUrl) => updateForm({ multiCityTemplateUrl })}
              placeholder="https://template1.myota.xyz/flightlist?adult=1&trips=DAC,KUL,2026-05-29"
            />
          </ToolCard>

          <ToolCard
            icon={<Bot className="h-5 w-5" />}
            title="Live Agent Contact"
            description="Redirect visitors to your WhatsApp, Telegram, or live-chat URL when they ask for a real agent."
            enabled={form.liveAgentEnabled}
            onEnabledChange={(liveAgentEnabled) => updateForm({ liveAgentEnabled })}
            saving={saving === "live_agent_contact"}
            onSave={() => void saveLiveAgent()}
          >
            <UrlField
              label="Live agent redirect URL"
              value={form.liveAgentRedirectUrl}
              onChange={(liveAgentRedirectUrl) => updateForm({ liveAgentRedirectUrl })}
              placeholder="https://wa.me/8801XXXXXXXXX"
            />
          </ToolCard>
        </div>
      </PageContent>
    </div>
  );
}

function ToolCard({
  icon,
  title,
  description,
  enabled,
  onEnabledChange,
  saving,
  onSave,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  saving: boolean;
  onSave: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-rm-trip-smooth border border-gray-100 bg-white shadow-rm-trip-card">
      <div className="border-b border-gray-100 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-rm-trip-smooth bg-rm-trip-brand/10 text-rm-trip-brand">
              {icon}
            </div>
            <div className="min-w-0">
              <h2 className="font-rm-trip-heading text-base font-semibold text-rm-trip-text">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-rm-trip-text-muted">{description}</p>
            </div>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm font-semibold text-rm-trip-text">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => onEnabledChange(event.target.checked)}
              className="h-4 w-4 accent-rm-trip-brand"
            />
            Enabled
          </label>
        </div>
      </div>
      <div className="space-y-4 p-5">
        {children}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-rm-trip-smooth bg-rm-trip-brand px-4 py-2.5 text-sm font-bold text-white shadow-rm-trip-card transition-all hover:bg-rm-trip-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Tool
        </button>
      </div>
    </section>
  );
}

function UrlField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-bold text-rm-trip-text">
        <ExternalLink className="h-3.5 w-3.5 text-rm-trip-text-muted" />
        {label}
      </span>
      <input
        type="url"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-rm-trip-smooth border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-rm-trip-text outline-none transition-all placeholder:text-gray-400 focus-rm-trip-highlight focus:bg-white"
      />
    </label>
  );
}

function toFormState(configs: ChatToolConfig[]): ToolFormState {
  const byKey = new Map(configs.map((config) => [config.toolKey, config]));
  const flight = byKey.get("flight_search");
  const liveAgent = byKey.get("live_agent_contact");

  return {
    flightEnabled: Boolean(flight?.enabled),
    oneWayTemplateUrl: stringValue(flight?.config.oneWayTemplateUrl),
    roundTripTemplateUrl: stringValue(flight?.config.roundTripTemplateUrl),
    multiCityTemplateUrl: stringValue(flight?.config.multiCityTemplateUrl),
    liveAgentEnabled: Boolean(liveAgent?.enabled),
    liveAgentRedirectUrl: stringValue(liveAgent?.config.redirectUrl),
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readApiError(error: unknown, fallback: string) {
  const response = (error as { response?: { data?: { message?: string } } }).response;
  return response?.data?.message ?? fallback;
}

export default ToolsPage;
