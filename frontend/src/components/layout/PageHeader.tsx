import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { useAppLayout } from "./AppLayout";

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  const { openMobileMenu } = useAppLayout();

  return (
    <>
      <header className="sticky top-0 z-30 shrink-0 border-b border-gray-100 bg-white/95 backdrop-blur md:hidden">
        <div className="flex h-16 items-center gap-3 px-4">
          <button
            type="button"
            onClick={openMobileMenu}
            aria-label="Open menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gray-50 text-rm-trip-text-muted transition-all active:scale-95"
          >
            <Menu className="h-5 w-5 stroke-[2.35]" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-rm-trip-heading text-lg font-semibold leading-tight text-rm-trip-text">{title}</h1>
          </div>
        </div>
      </header>

      <header className="sticky top-0 z-10 hidden min-h-16 shrink-0 flex-col gap-3 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur md:flex md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {/* <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-rm-trip-smooth bg-rm-trip-brand shadow-rm-trip-card">
            <img src="/favicon.svg" alt="" className="h-5 w-5" />
          </div> */}
          <div className="min-w-0">
            <h1 className="truncate font-rm-trip-heading text-base font-semibold leading-tight text-rm-trip-text">{title}</h1>
            {subtitle && <p className="mt-0.5 truncate text-xs text-rm-trip-text-muted">{subtitle}</p>}
          </div>
        </div>
        {children && <div className="flex shrink-0 items-center gap-2.5 overflow-x-auto">{children}</div>}
      </header>
    </>
  );
}
