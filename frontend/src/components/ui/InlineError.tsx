import { AlertCircle, RefreshCw } from "lucide-react";

interface InlineErrorProps {
  title?: string;
  message: string;
  actionLabel?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export function InlineError({
  title = "Something went wrong",
  message,
  actionLabel = "Try again",
  onRetry,
  retrying = false,
}: InlineErrorProps) {
  return (
    <div className="rounded-rm-trip-smooth border border-red-100 bg-red-50 px-5 py-4 text-sm shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rm-trip-state-error" />
          <div>
            <p className="font-semibold text-rm-trip-text">{title}</p>
            <p className="mt-1 text-rm-trip-text-muted">{message}</p>
          </div>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex items-center justify-center gap-2 rounded-rm-trip-smooth border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-rm-trip-state-error transition-all hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${retrying ? "animate-spin" : ""}`} />
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
