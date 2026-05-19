import type { ReactNode } from "react";

interface AuthSurfaceProps {
  children: ReactNode;
}

export function AuthSurface({ children }: AuthSurfaceProps) {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-white sm:bg-rm-trip-surface">
      <div className="absolute inset-0 -z-10 hidden bg-[radial-gradient(circle_at_18%_18%,rgba(37,99,235,0.16),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(20,184,166,0.12),transparent_28%),linear-gradient(135deg,#f8fafc_0%,#eef4ff_48%,#f8fafc_100%)] sm:block" />
      <div className="absolute left-1/2 top-16 -z-10 hidden h-72 w-[36rem] -translate-x-1/2 rounded-full bg-white/60 blur-3xl sm:block" />
      <div className="flex min-h-dvh w-full sm:items-center sm:justify-center sm:px-4 sm:py-10">{children}</div>
    </div>
  );
}
