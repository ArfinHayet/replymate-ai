import type { ReactNode } from "react";

interface AuthSurfaceProps {
  children: ReactNode;
}

export function AuthSurface({ children }: AuthSurfaceProps) {
  return (
    <div className="theme-grid min-h-dvh overflow-hidden">
      <div className="flex min-h-dvh w-full sm:items-center sm:justify-center sm:px-4 sm:py-10">{children}</div>
    </div>
  );
}
