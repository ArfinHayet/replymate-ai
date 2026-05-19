import type { ReactNode } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { BarChart3, FileText, MessageSquare, RefreshCw, TrendingUp } from "lucide-react";
import { PageContent } from "@/components/layout/PageContent";
import { PageHeader } from "@/components/layout/PageHeader";
import { InlineError } from "@/components/ui/InlineError";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsViewModel } from "../../viewModel/useAnalyticsViewModel";
import type { ChartPoint } from "../../viewModel/AnalyticsViewModel";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Filler, Tooltip, Legend);

const brandBlue = "#2563eb";
const brandTeal = "#14b8a6";
const warningAmber = "#f59e0b";
const errorRed = "#dc2626";
const mutedText = "#6b7280";
const gridLine = "rgba(148, 163, 184, 0.18)";

const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        color: mutedText,
        font: { family: "Manrope", size: 12, weight: 600 },
        usePointStyle: true,
      },
    },
    tooltip: {
      backgroundColor: "#111827",
      bodyColor: "#ffffff",
      borderColor: "rgba(255,255,255,0.08)",
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: false,
      padding: 12,
      titleColor: "#ffffff",
      titleFont: { family: "Manrope", size: 12, weight: 700 },
      bodyFont: { family: "Manrope", size: 12, weight: 600 },
    },
  },
} satisfies ChartOptions;

const axisOptions = {
  ...baseChartOptions,
  scales: {
    x: {
      border: { display: false },
      grid: { display: false },
      ticks: { color: mutedText, font: { family: "Manrope", size: 12, weight: 600 } },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: { color: gridLine },
      ticks: { color: mutedText, precision: 0, font: { family: "Manrope", size: 12, weight: 600 } },
    },
  },
} satisfies ChartOptions<"bar" | "line">;

const doughnutOptions = {
  ...baseChartOptions,
  cutout: "72%",
  plugins: {
    ...baseChartOptions.plugins,
    legend: {
      ...baseChartOptions.plugins.legend,
      position: "bottom",
    },
  },
} satisfies ChartOptions<"doughnut">;

export function AnalyticsPage() {
  const vm = useAnalyticsViewModel();
  const refresh = async () => void (await vm.loadAnalytics());

  return (
    <div className="min-h-screen bg-rm-trip-surface">
      <PageHeader title="Analytics" subtitle="Conversation and content activity across your workspace.">
        <button
          onClick={() => void refresh()}
          disabled={vm.loading}
          className="inline-flex items-center gap-2 rounded-rm-trip-smooth border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-rm-trip-text-muted shadow-sm transition-all hover:border-gray-300 hover:text-rm-trip-text disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${vm.loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </PageHeader>

      <PageContent>
        {vm.error && !vm.loading && (
          <InlineError
            title="Could not load analytics"
            message="Workspace analytics are unavailable right now."
            onRetry={() => void refresh()}
            retrying={vm.loading}
          />
        )}

        <section className="space-y-4">
          <div className="min-w-0 rounded-rm-trip-smooth border border-gray-100 bg-white p-5 shadow-rm-trip-card sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-rm-trip-brand">Analytics Overview</p>
                <h2 className="mt-1 font-rm-trip-heading text-xl font-bold text-rm-trip-text sm:text-2xl">
                  Workspace performance at a glance
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-rm-trip-text-muted">
                Monitor conversations, knowledge sources, and indexed content from one dashboard.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<MessageSquare className="h-4 w-4" />} label="Conversations" value={vm.totalSessions} loading={vm.loading} />
            <MetricCard icon={<BarChart3 className="h-4 w-4" />} label="Messages" value={vm.totalMessages} loading={vm.loading} />
            <MetricCard icon={<FileText className="h-4 w-4" />} label="Sources" value={vm.totalContentSources} loading={vm.loading} />
            <MetricCard icon={<TrendingUp className="h-4 w-4" />} label="Sections" value={vm.totalIndexedSections} loading={vm.loading} />
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <ChartPanel title="Activity This Week" subtitle="Chats and content additions by day">
            {vm.loading ? <ChartSkeleton /> : <LineChart data={vm.activityByDay} />}
          </ChartPanel>

          <ChartPanel title="Content Mix" subtitle="Knowledge sources by type">
            {vm.loading ? <ChartSkeleton compact /> : <DoughnutChart data={vm.contentByType} />}
          </ChartPanel>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ChartPanel
            title="Web Crawl Health"
            subtitle="Fetched pages compared with failed crawl attempts"
            aside={!vm.loading && <HealthBadge data={vm.crawlHealth} />}
          >
            {vm.loading ? <ChartSkeleton /> : <CrawlHealthChart data={vm.crawlHealth} />}
          </ChartPanel>

          <ChartPanel title="Top Indexed Sites" subtitle="Largest web sources by content sections">
            {vm.loading ? <ChartSkeleton /> : <TopSitesChart data={vm.topWebPages} />}
          </ChartPanel>
        </div>
      </PageContent>
    </div>
  );
}

function MetricCard({ icon, label, value, loading }: { icon: ReactNode; label: string; value: number; loading: boolean }) {
  return (
    <div className="min-w-0 rounded-rm-trip-smooth border border-gray-100 bg-white p-5 shadow-rm-trip-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-rm-trip-text-muted">{label}</p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-rm-trip-smooth bg-blue-50 text-rm-trip-brand">
          {icon}
        </span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <p className="truncate font-rm-trip-heading text-2xl font-bold text-rm-trip-text sm:text-3xl">{value.toLocaleString()}</p>
      )}
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  children,
  aside,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-rm-trip-smooth border border-gray-100 bg-white p-5 shadow-rm-trip-card sm:p-6">
      <div className="mb-5 flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate font-rm-trip-heading text-base font-semibold text-rm-trip-text">{title}</h2>
          <p className="mt-1 text-sm text-rm-trip-text-muted">{subtitle}</p>
        </div>
        {aside ?? (
          <span className="hidden rounded-rm-trip-smooth bg-gray-50 px-2.5 py-1 text-xs font-semibold text-rm-trip-text-muted sm:inline-flex">
            Chart.js
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function LineChart({ data }: { data: ChartPoint[] }) {
  const chartData: ChartData<"line"> = {
    labels: data.map((item) => item.label),
    datasets: [
      {
        label: "Activity",
        data: data.map((item) => item.value),
        backgroundColor: "rgba(37, 99, 235, 0.12)",
        borderColor: brandBlue,
        borderWidth: 3,
        fill: true,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: brandBlue,
        pointBorderWidth: 3,
        pointHoverRadius: 6,
        pointRadius: 4,
        tension: 0.42,
      },
    ],
  };

  return (
    <div className="h-72">
      <Line data={chartData} options={axisOptions as ChartOptions<"line">} />
    </div>
  );
}

function DoughnutChart({ data }: { data: ChartPoint[] }) {
  if (data.every((item) => item.value === 0)) return <EmptyChart label="No content sources yet" />;

  const chartData: ChartData<"doughnut"> = {
    labels: data.map((item) => item.label),
    datasets: [
      {
        data: data.map((item) => item.value),
        backgroundColor: [brandBlue, brandTeal, warningAmber],
        borderColor: "#ffffff",
        borderRadius: 8,
        borderWidth: 4,
        hoverOffset: 8,
      },
    ],
  };

  return (
    <div className="mx-auto h-72 max-w-sm">
      <Doughnut data={chartData} options={doughnutOptions} />
    </div>
  );
}

function CrawlHealthChart({ data }: { data: ChartPoint[] }) {
  if (data.every((item) => item.value === 0)) return <EmptyChart label="No crawl data yet" />;

  const chartData: ChartData<"bar"> = {
    labels: data.map((item) => item.label),
    datasets: [
      {
        label: "Pages",
        data: data.map((item) => item.value),
        backgroundColor: [brandTeal, errorRed],
        borderRadius: 10,
        borderSkipped: false,
      },
    ],
  };

  return (
    <div className="space-y-5">
      <div className="h-64">
        <Bar data={chartData} options={axisOptions as ChartOptions<"bar">} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {data.map((item, index) => (
          <div key={item.label} className="rounded-rm-trip-smooth bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold text-rm-trip-text-muted">{item.label}</p>
            <p className={`mt-1 font-rm-trip-heading text-xl font-bold ${index === 1 ? "text-rm-trip-state-error" : "text-rm-trip-brand"}`}>
              {item.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopSitesChart({ data }: { data: ChartPoint[] }) {
  if (data.length === 0 || data.every((item) => item.value === 0)) return <EmptyChart label="No indexed web pages yet" />;

  const chartData: ChartData<"bar"> = {
    labels: data.map((item) => truncateLabel(item.label)),
    datasets: [
      {
        label: "Sections",
        data: data.map((item) => item.value),
        backgroundColor: "rgba(37, 99, 235, 0.88)",
        borderRadius: 10,
        borderSkipped: false,
      },
    ],
  };

  return (
    <div className="space-y-5">
      <div className="h-64">
        <Bar data={chartData} options={axisOptions as ChartOptions<"bar">} />
      </div>
      <div className="space-y-2">
        {data.slice(0, 3).map((item, index) => (
          <div key={item.label} className="flex min-w-0 items-center justify-between gap-3 rounded-rm-trip-smooth bg-gray-50 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-rm-trip-smooth bg-blue-50 text-xs font-bold text-rm-trip-brand">
                {index + 1}
              </span>
              <p className="truncate text-sm font-semibold text-rm-trip-text">{item.label}</p>
            </div>
            <span className="shrink-0 text-sm font-bold text-rm-trip-brand">{item.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-rm-trip-smooth border border-dashed border-gray-200 bg-gray-50 text-sm font-semibold text-rm-trip-text-muted">
      {label}
    </div>
  );
}

function ChartSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-4">
      <Skeleton className={compact ? "mx-auto h-56 w-56 rounded-full" : "h-56 w-full"} />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

function truncateLabel(label: string) {
  return label.length > 18 ? `${label.slice(0, 18)}...` : label;
}

function HealthBadge({ data }: { data: ChartPoint[] }) {
  const fetched = data.find((item) => item.label === "Fetched")?.value ?? 0;
  const failed = data.find((item) => item.label === "Failed")?.value ?? 0;
  const total = fetched + failed;
  const rate = total === 0 ? 0 : Math.round((fetched / total) * 100);

  return (
    <span className="hidden rounded-rm-trip-smooth bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-rm-trip-success sm:inline-flex">
      {rate}% success
    </span>
  );
}

export default AnalyticsPage;
