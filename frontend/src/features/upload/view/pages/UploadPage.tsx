import { useCallback, useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { PageContent } from "@/components/layout/PageContent";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api";
import { apiRoutes } from "@/lib/apiRoutes";
import { useUploadViewModel } from "../../viewModel/useUploadViewModel";
import type { UploadActionResult } from "../../viewModel/UploadViewModel";
import { ImageUploadPanel } from "../components/ImageUploadPanel";
import { MarkdownUploadPanel } from "../components/MarkdownUploadPanel";
import { PdfUploadPanel } from "../components/PdfUploadPanel";
import { UploadSteps } from "../components/UploadSteps";
import { UploadTabs } from "../components/UploadTabs";
import { UrlUploadPanel } from "../components/UrlUploadPanel";

function showActionResult(result: UploadActionResult) {
  if (result.message) toast.success(result.message);
  if (result.errorMessage) toast.error(result.errorMessage);
}

type ContentQuota = {
  used: number;
  limit: number;
  remaining: number;
};

type UsageResponse = {
  usage: {
    plan: {
      name: string;
      webCrawlLimit?: number;
      pdfUploadLimit?: number;
      imageUploadLimit?: number;
    };
    contentUsage?: {
      webPages: ContentQuota;
      pdfs: ContentQuota;
      images: ContentQuota;
    };
  };
};

function formatPlanName(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

function formatQuotaStatus(label: string, quota: ContentQuota) {
  const singular = label === "images" ? "image" : label.slice(0, -1);
  const usage = `${quota.used.toLocaleString()} / ${quota.limit.toLocaleString()}`;

  if (quota.remaining > 0) {
    return `${label}: ${pluralize(quota.remaining, singular)} remaining (${usage})`;
  }

  if (quota.used > quota.limit) {
    return `${label}: over limit (${usage})`;
  }

  return `${label}: limit reached (${usage})`;
}

export function UploadPage() {
  const viewModel = useUploadViewModel();
  const [usage, setUsage] = useState<UsageResponse["usage"] | null>(null);

  const loadUsage = useCallback(async () => {
    try {
      const response = await api.get<UsageResponse>(apiRoutes.auth.me);
      setUsage(response.data.usage);
    } catch {
      setUsage(null);
    }
  }, []);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  const uploadPdf = async () => {
    const result = await viewModel.uploadSelectedPdf();
    showActionResult(result);
    if (result.success) void loadUsage();
  };

  const uploadMarkdown = async () => {
    showActionResult(await viewModel.uploadSelectedMarkdown());
  };

  const ingestUrls = async () => {
    const result = await viewModel.ingestUrls();
    showActionResult(result);
    if (result.message) void loadUsage();
  };

  const handleAsyncFileResult = async (result: Promise<UploadActionResult>) => {
    showActionResult(await result);
  };

  const saveImage = async () => {
    const result = await viewModel.saveSelectedImage();
    showActionResult(result);
    if (result.success) void loadUsage();
  };

  return (
    <div className="min-h-screen bg-rm-trip-surface">
      <PageHeader
        title="Add Content"
        subtitle="Upload documents, web pages, and images your assistant can use."
      />
      <PageContent>
        <SubscriptionLimitAlert usage={usage} />

        <UploadTabs activeTab={viewModel.activeTab} onChange={viewModel.setActiveTab} />

        <div className="overflow-hidden rounded-rm-trip-smooth border border-gray-100 bg-white">
          {viewModel.activeTab === "pdf" && (
            <PdfUploadPanel viewModel={viewModel} onUpload={() => void uploadPdf()} onFileResult={showActionResult} />
          )}
          {viewModel.activeTab === "markdown" && (
            <MarkdownUploadPanel
              viewModel={viewModel}
              onUpload={() => void uploadMarkdown()}
              onFileResult={showActionResult}
            />
          )}
          {viewModel.activeTab === "url" && <UrlUploadPanel viewModel={viewModel} onIngest={() => void ingestUrls()} />}
          {viewModel.activeTab === "image" && (
            <ImageUploadPanel
              viewModel={viewModel}
              onSave={() => void saveImage()}
              onFileResult={(result) => void handleAsyncFileResult(result)}
            />
          )}
        </div>

        <UploadSteps />
      </PageContent>
    </div>
  );
}

function SubscriptionLimitAlert({ usage }: { usage: UsageResponse["usage"] | null }) {
  const contentUsage =
    usage?.contentUsage ??
    (usage
      ? {
          webPages: {
            used: 0,
            limit: usage.plan.webCrawlLimit ?? 0,
            remaining: usage.plan.webCrawlLimit ?? 0,
          },
          pdfs: {
            used: 0,
            limit: usage.plan.pdfUploadLimit ?? 0,
            remaining: usage.plan.pdfUploadLimit ?? 0,
          },
          images: {
            used: 0,
            limit: usage.plan.imageUploadLimit ?? 0,
            remaining: usage.plan.imageUploadLimit ?? 0,
          },
        }
      : null);

  if (!usage || !contentUsage) {
    return (
      <div className="rounded-rm-trip-smooth border border-gray-100 bg-white px-4 py-3 text-sm font-semibold text-rm-trip-text-muted shadow-rm-trip-card">
        Loading your content limits...
      </div>
    );
  }

  const items = [
    { label: "URLs", quota: contentUsage.webPages },
    { label: "PDFs", quota: contentUsage.pdfs },
    { label: "images", quota: contentUsage.images },
  ];
  const hasBlockedContentType = items.some(({ quota }) => quota.remaining === 0);

  return (
    <div
      className={`rounded-rm-trip-smooth border px-4 py-3 text-sm text-rm-trip-text shadow-rm-trip-card ${
        hasBlockedContentType ? "border-amber-100 bg-amber-50" : "border-blue-100 bg-blue-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className={`mt-0.5 h-4 w-4 shrink-0 ${
            hasBlockedContentType ? "text-amber-600" : "text-rm-trip-brand"
          }`}
        />
        <div className="min-w-0">
          <p className="font-semibold">
            {formatPlanName(usage.plan.name)} plan content limits
          </p>
          <p className="mt-1 leading-6 text-rm-trip-text-muted">
            {items.map(({ label, quota }) => formatQuotaStatus(label, quota)).join(", ")}.
          </p>
        </div>
      </div>
    </div>
  );
}
