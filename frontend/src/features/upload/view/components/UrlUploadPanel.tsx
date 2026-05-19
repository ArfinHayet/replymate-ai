import { ArrowRight, CheckCircle2, Link2, Loader2, Plus, Trash2, XCircle } from "lucide-react";
import type { UploadViewModel } from "../../viewModel/UploadViewModel";
import { ErrorBanner, ProgressBar, SuccessBanner } from "./UploadFeedback";

interface UrlUploadPanelProps {
  viewModel: UploadViewModel;
  onIngest: () => void;
}

export function UrlUploadPanel({ viewModel, onIngest }: UrlUploadPanelProps) {
  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="font-rm-trip-heading font-semibold text-rm-trip-text text-base mb-0.5">Add web pages</h2>
        <p className="text-rm-trip-text-muted text-xs">Add one or more pages your assistant can reference</p>
      </div>
      <div className="space-y-2.5">
        {viewModel.urls.map((url, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-rm-trip-text-muted pointer-events-none" />
              <input
                type="url"
                value={url}
                onChange={(event) => viewModel.updateUrl(index, event.target.value)}
                placeholder="https://example.com/docs/page"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-rm-trip-smooth text-sm text-rm-trip-text placeholder:text-gray-400 focus-rm-trip-highlight bg-gray-50 focus:bg-white transition-colors duration-150"
              />
            </div>
            {viewModel.urls.length > 1 && (
              <button
                onClick={() => viewModel.removeUrl(index)}
                className="h-9 w-9 flex items-center justify-center rounded-rm-trip-smooth border border-gray-200 text-rm-trip-text-muted hover:text-rm-trip-state-error hover:border-red-200 hover:bg-red-50 transition-all duration-150"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={viewModel.addUrl}
        className="flex items-center gap-2 text-rm-trip-brand hover:text-rm-trip-brand-dark text-sm font-semibold transition-colors duration-150"
      >
        <Plus className="h-4 w-4" />
        Add another URL
      </button>
      {viewModel.urlState === "uploading" && <ProgressBar value={viewModel.urlProgress} />}
      {(viewModel.urlState === "uploading" || viewModel.urlState === "success") && viewModel.urlScanItems.length > 0 && (
        <div className="rounded-rm-trip-smooth border border-blue-100 bg-blue-50/60 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-xs font-semibold text-rm-trip-brand">Live scan</p>
            <p className="text-xs text-rm-trip-text-muted">
              {viewModel.urlScanItems.length} page{viewModel.urlScanItems.length !== 1 ? "s" : ""} seen
            </p>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {viewModel.urlScanItems.map((scan) => (
              <div key={scan.url} className="flex items-start gap-2 text-xs">
                {scan.status === "scanning" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-rm-trip-brand shrink-0 mt-0.5" />
                ) : scan.status === "done" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                )}
                <p className="min-w-0 break-all text-rm-trip-text">
                  <span className="font-semibold">
                    {scan.status === "scanning" ? "Scanning:" : scan.status === "done" ? "Scanned:" : "Failed:"}
                  </span>{" "}
                  {scan.url}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      {viewModel.urlState === "success" && viewModel.urlResults.length > 0 && (
        <SuccessBanner>
          <div className="space-y-1.5 flex-1">
            {viewModel.urlResults.map((result, index) => (
              <div key={`${result.url}-${index}`} className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-800 truncate">{result.url}</p>
                  {result.success ? (
                    <p className="text-xs text-emerald-700">
                      {result.title} | {result.pagesFetched ?? 1} page
                      {(result.pagesFetched ?? 1) !== 1 ? "s" : ""} | {result.chunksCreated} sections
                      {(result.pagesFailed ?? 0) > 0 ? ` | ${result.pagesFailed} failed` : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-red-600">{result.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SuccessBanner>
      )}
      {viewModel.urlState === "error" && <ErrorBanner msg="Unable to add URLs. See the toast for details." />}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onIngest}
          disabled={viewModel.validUrls.length === 0 || viewModel.urlState === "uploading"}
          className="flex items-center gap-2 bg-rm-trip-brand hover:bg-rm-trip-brand-dark text-white font-semibold py-2.5 px-5 rounded-rm-trip-smooth shadow-rm-trip-card transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <ArrowRight className="h-4 w-4" />
          {viewModel.urlState === "uploading"
            ? "Processing..."
            : `Add ${viewModel.validUrls.length > 0 ? viewModel.validUrls.length : ""} URL${
                viewModel.validUrls.length !== 1 ? "s" : ""
              }`}
        </button>
        {viewModel.urlState !== "idle" && (
          <button
            onClick={viewModel.resetUrls}
            className="flex items-center gap-2 border border-gray-200 text-rm-trip-text-muted hover:text-rm-trip-text hover:border-gray-300 font-semibold py-2.5 px-5 rounded-rm-trip-smooth transition-all duration-150 text-sm bg-white"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
