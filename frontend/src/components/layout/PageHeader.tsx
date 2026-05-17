import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between px-6 bg-white/[0.92] backdrop-blur-[16px] border-b border-black/[0.07]">
      <div className="flex items-center gap-3">
        <div className="relative w-[38px] h-[38px] shrink-0 overflow-hidden rounded-xl bg-blue-600 flex items-center justify-center shadow-[0_4px_20px_rgba(37,99,235,0.22)]">
          <img src="/favicon.svg" alt="" className="w-[22px] h-[22px] relative z-10" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-slate-900 tracking-[-0.2px] leading-none">{title}</p>
          {subtitle && <p className="text-[12px] text-slate-400 mt-[1px]">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2.5">{children}</div>}
    </header>
  );
}
