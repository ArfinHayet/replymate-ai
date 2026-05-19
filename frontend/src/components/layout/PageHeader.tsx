import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex min-h-16 shrink-0 flex-col gap-3 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur md:flex-row md:items-center md:justify-between md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-rm-trip-smooth bg-rm-trip-brand shadow-rm-trip-card">
          <img src="/favicon.svg" alt="" className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-rm-trip-heading text-base font-semibold leading-tight text-rm-trip-text">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-xs text-rm-trip-text-muted">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex shrink-0 items-center gap-2.5 overflow-x-auto">{children}</div>}
    </header>
  );
}
