import { Skeleton } from "@/components/ui/skeleton";
import { useAuthCallbackViewModel } from "../../viewModel/useAuthCallbackViewModel";

export function AuthCallbackPage() {
  useAuthCallbackViewModel();

  return (
    <div className="theme-grid flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div aria-busy="true" className="flex w-full max-w-sm flex-col items-center gap-3 rounded-rm-trip-smooth border border-gray-200 bg-white p-8 text-center shadow-rm-trip-card">
        <Skeleton className="h-10 w-10 rounded-full" />
        <p className="text-sm font-semibold text-rm-trip-text">Completing sign-in...</p>
        <Skeleton className="h-3 w-52 max-w-full" />
        <p className="text-xs font-medium text-rm-trip-text-muted">You will be redirected automatically.</p>
      </div>
    </div>
  );
}
