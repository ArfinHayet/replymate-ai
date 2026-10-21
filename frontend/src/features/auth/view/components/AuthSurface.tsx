import type { ReactNode } from "react";
import { LandingHeader } from "@/features/landing/view/components/LandingHeader";

interface AuthSurfaceProps {
  children: ReactNode;
}

export function AuthSurface({ children }: AuthSurfaceProps) {
  return (
    <div className="theme-grid flex min-h-dvh flex-col">
      <LandingHeader isAuthenticated={false} showHomeAction />
      <div className="flex w-full flex-1 sm:items-center sm:justify-center sm:px-4 sm:py-10">{children}</div>
    </div>
  );
}
