import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DASHBOARD_PATH, logoClasses, logoMarkClasses, logoNameClasses, shell } from "./landingContent";

export function LandingHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <header className="sticky top-0 z-[100] border-b border-gray-200 bg-rm-trip-surface-card">
      <div className={cn(shell, "flex h-[62px] items-center justify-between gap-4 px-7 max-[700px]:h-[58px] max-[700px]:px-3.5")}>
        <a href="#" className={logoClasses} aria-label="SupportMate home">
          <img src="/favicon.svg" alt="SupportMate logo" className={logoMarkClasses} />
          <span className={cn(logoNameClasses, "max-[700px]:text-base")}>SupportMate</span>
        </a>
        <nav className="flex items-center max-[860px]:hidden">
          {[
            ["Workflow", "#how"],
            ["Screenshots", "#screenshots"],
            ["Features", "#features"],
            ["Pricing", "#pricing"],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="whitespace-nowrap rounded-rm-trip-smooth px-[13px] py-1.5 text-[13.5px] font-medium text-[var(--rm-trip-text-muted)] no-underline transition hover:bg-[var(--rm-trip-surface)] hover:text-[var(--rm-trip-text)]"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2 max-[700px]:gap-1.5">
          <Link
            to={isAuthenticated ? DASHBOARD_PATH : "/login"}
            className="rounded-rm-trip-smooth border border-gray-300 bg-white px-[15px] py-[7px] text-[13.5px] font-semibold text-rm-trip-text no-underline transition-colors hover:bg-rm-trip-surface max-[700px]:px-2.5 max-[700px]:py-1.5 max-[700px]:text-xs"
          >
            {isAuthenticated ? "Go to dashboard" : "Sign in"}
          </Link>
        </div>
      </div>
    </header>
  );
}
