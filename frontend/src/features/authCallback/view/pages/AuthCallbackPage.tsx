import { Loader2 } from "lucide-react";
import { useAuthCallbackViewModel } from "../../viewModel/useAuthCallbackViewModel";

export function AuthCallbackPage() {
  useAuthCallbackViewModel();

  return (
    <div className="theme-grid flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-rm-trip-smooth border border-gray-200 bg-white p-8 text-center shadow-rm-trip-card">
        <Loader2 className="h-8 w-8 animate-spin text-rm-trip-brand" />
        <p className="text-sm font-semibold text-rm-trip-text">Completing sign-in...</p>
        <p className="text-xs font-medium text-rm-trip-text-muted">You will be redirected automatically.</p>
      </div>
    </div>
  );
}
