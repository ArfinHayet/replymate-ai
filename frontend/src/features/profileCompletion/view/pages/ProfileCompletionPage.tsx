import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, CheckCircle2, FileUp, RefreshCw } from "lucide-react";
import { PageContent } from "@/components/layout/PageContent";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api";
import { apiRoutes } from "@/lib/apiRoutes";
import type { ProfileCompletion } from "../../model/entities/ProfileCompletion";

interface ProfileCompletionPageProps {
  status?: ProfileCompletion | null;
  loading?: boolean;
  onRefresh?: () => void;
}

const steps = [
  {
    key: "company",
    title: "Company information",
    description: "Add your company name and a short business description.",
    to: "/company",
    icon: Building2,
  },
  {
    key: "content",
    title: "Knowledge source",
    description: "Add at least one website URL or PDF document.",
    to: "/upload",
    icon: FileUp,
  },
] as const;

export function ProfileCompletionPage({
  status,
  loading = false,
  onRefresh,
}: ProfileCompletionPageProps) {
  const [localStatus, setLocalStatus] = useState<ProfileCompletion | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  const loadLocalStatus = useCallback(async () => {
    if (status !== undefined) return;

    try {
      setLocalLoading(true);
      const response = await api.get<ProfileCompletion>(apiRoutes.profileCompletion.status);
      setLocalStatus(response.data);
    } finally {
      setLocalLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void loadLocalStatus();
  }, [loadLocalStatus]);

  const currentStatus = status ?? localStatus;
  const currentLoading = loading || localLoading;
  const refresh = onRefresh ?? (() => void loadLocalStatus());
  const completed = {
    company: Boolean(currentStatus?.hasCompanyInfo),
    content: Boolean(currentStatus?.hasContentSource),
  };

  return (
    <div className="min-h-screen bg-rm-trip-surface">
      <PageHeader
        title="Profile Completion"
        subtitle="Finish setup to unlock the rest of your workspace."
      >
        {refresh && (
          <button
            type="button"
            onClick={refresh}
            disabled={currentLoading}
            className="flex items-center gap-2 rounded-rm-trip-smooth border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-rm-trip-text-muted shadow-sm transition-all hover:border-gray-300 hover:text-rm-trip-text disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${currentLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        )}
      </PageHeader>

      <PageContent>
        <section className="rounded-rm-trip-smooth border border-gray-100 bg-white p-5 shadow-rm-trip-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-rm-trip-text-muted">Workspace setup</p>
              <h2 className="mt-1 font-rm-trip-heading text-2xl font-semibold text-rm-trip-text">
                {currentStatus?.isComplete ? "Your profile is complete" : "Complete these two steps"}
              </h2>
            </div>
            <div className="min-w-36 text-left md:text-right">
              <p className="font-rm-trip-heading text-3xl font-semibold text-rm-trip-brand">
                {currentStatus?.completionPercent ?? 0}%
              </p>
              <p className="text-xs font-semibold text-rm-trip-text-muted">complete</p>
            </div>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-rm-trip-brand transition-all"
              style={{ width: `${currentStatus?.completionPercent ?? 0}%` }}
            />
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const done = completed[step.key];
            return (
              <Link
                key={step.key}
                to={step.to}
                className="group flex min-h-40 cursor-pointer flex-col justify-between rounded-rm-trip-smooth border border-gray-100 bg-white p-5 shadow-rm-trip-card transition-all hover:-translate-y-0.5 hover:border-rm-trip-brand/45 hover:shadow-[0_18px_45px_rgba(15,23,42,0.10)] focus:outline-none focus:ring-2 focus:ring-rm-trip-brand/35 focus:ring-offset-2"
                aria-label={`Open ${step.title}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-rm-trip-smooth ${
                        done ? "bg-emerald-50 text-emerald-600" : "bg-rm-trip-brand/10 text-rm-trip-brand"
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-rm-trip-text-muted">Step {index + 1}</p>
                      <h3 className="mt-1 font-rm-trip-heading text-base font-semibold text-rm-trip-text">
                        {step.title}
                      </h3>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {done ? "Done" : "Required"}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-sm leading-6 text-rm-trip-text-muted">{step.description}</p>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-rm-trip-smooth bg-rm-trip-brand px-3 py-2 text-sm font-bold text-white shadow-sm transition-all group-hover:bg-rm-trip-brand-dark">
                    {done ? "Review step" : "Complete step"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        <section className="rounded-rm-trip-smooth border border-gray-100 bg-white p-5 shadow-rm-trip-card">
          <div className="grid gap-3 text-sm md:grid-cols-3">
            <StatusMetric label="Companies" value={currentStatus?.companyCount ?? 0} />
            <StatusMetric label="PDFs" value={currentStatus?.pdfCount ?? 0} />
            <StatusMetric label="URLs" value={currentStatus?.webPageCount ?? 0} />
          </div>
        </section>
      </PageContent>
    </div>
  );
}

function StatusMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-rm-trip-smooth border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs font-semibold text-rm-trip-text-muted">{label}</p>
      <p className="mt-1 font-rm-trip-heading text-2xl font-semibold text-rm-trip-text">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

export default ProfileCompletionPage;
