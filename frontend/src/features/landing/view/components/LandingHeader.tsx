import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DASHBOARD_PATH, logoClasses, logoMarkClasses, logoNameClasses, shell } from "./landingContent";

const sectionLinks = [
  ["Workflow", "#how"],
  ["Screenshots", "#screenshots"],
  ["Features", "#features"],
] as const;

export function LandingHeader({ isAuthenticated, showHomeAction = false }: { isAuthenticated: boolean; showHomeAction?: boolean }) {
  const isLandingPage = useLocation().pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-[100] border-b border-gray-200 bg-rm-trip-surface-card shadow-rm-trip-card">
      <div className={cn(shell, "flex h-[62px] items-center justify-between gap-4 px-7 max-[700px]:h-[58px] max-[700px]:px-3.5")}>
        <Link to="/" className={logoClasses} aria-label="SupportMate home">
          <img src="/favicon.svg" alt="SupportMate logo" className={logoMarkClasses} />
          <span className={cn(logoNameClasses, "max-[700px]:text-base")}>SupportMate</span>
        </Link>
        <nav className="flex items-center max-[860px]:hidden">
          {sectionLinks.map(([label, href]) => (
            <a
              key={label}
              href={isLandingPage ? href : `/${href}`}
              className="whitespace-nowrap rounded-rm-trip-smooth px-[13px] py-1.5 text-[13.5px] font-medium text-[var(--rm-trip-text-muted)] no-underline transition hover:bg-[var(--rm-trip-surface)] hover:text-[var(--rm-trip-text)]"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2 max-[700px]:gap-1.5">
          <button
            type="button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="hidden h-9 w-9 items-center justify-center rounded-rm-trip-smooth border border-gray-300 text-rm-trip-text max-[860px]:inline-flex"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <Link
            to={isAuthenticated ? DASHBOARD_PATH : showHomeAction ? "/" : "/login"}
            className="rounded-rm-trip-smooth border border-gray-300 bg-white px-[15px] py-[7px] text-[13.5px] font-semibold text-rm-trip-text no-underline transition-colors hover:bg-rm-trip-surface max-[700px]:px-2.5 max-[700px]:py-1.5 max-[700px]:text-xs"
          >
            {isAuthenticated ? "Go to dashboard" : showHomeAction ? "Back to home" : "Sign in"}
          </Link>
        </div>
      </div>
      {menuOpen && (
        <nav id="mobile-site-navigation" aria-label="Site sections" className="hidden border-t border-gray-200 px-4 py-2 max-[860px]:flex max-[860px]:flex-col">
          {sectionLinks.map(([label, href]) => (
            <a
              key={label}
              href={isLandingPage ? href : `/${href}`}
              onClick={() => setMenuOpen(false)}
              className="rounded-rm-trip-smooth px-3 py-2 text-sm font-medium text-rm-trip-text-muted hover:bg-rm-trip-surface hover:text-rm-trip-text"
            >
              {label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
