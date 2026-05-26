import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  ChartColumn,
  CheckCircle2,
  Code2,
  FileUp,
  Files,
  Globe,
  History,
  Images,
  LogOut,
  MessageSquare,
  Sparkles,
  Wrench,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLogoutViewModel } from "@/features/auth/viewModel/useLogoutViewModel";
import { api } from "@/lib/api";
import { apiRoutes } from "@/lib/apiRoutes";
import type { ProfileCompletion } from "@/features/profileCompletion";

type MessageUsage = {
  plan: {
    id: number;
    name: string;
    monthlyMessageLimit: number;
  };
  periodStart: string;
  periodEnd: string;
  usedMessages: number;
  remainingMessages: number;
};

const navItems = [
  { to: "/profile-completion", icon: CheckCircle2, label: "Profile Completion", requiresCompletion: false },
  { to: "/company", icon: Building2, label: "Company", requiresCompletion: false },
  { to: "/upload", icon: FileUp, label: "Add Content", requiresCompletion: false },
  { to: "/chat", icon: MessageSquare, label: "Chat", requiresCompletion: true },
  { to: "/pdfs", icon: Files, label: "Documents", requiresCompletion: true },
  { to: "/web-pages", icon: Globe, label: "Web Pages", requiresCompletion: true },
  { to: "/images", icon: Images, label: "Images", requiresCompletion: true },
  { to: "/analytics", icon: ChartColumn, label: "Analytics", requiresCompletion: true },
  { to: "/chat-history", icon: History, label: "Chat History", requiresCompletion: true },
  { to: "/embed", icon: Code2, label: "Website Widget", requiresCompletion: true },
  { to: "/tools", icon: Wrench, label: "Tools", requiresCompletion: true },
  { to: "/upgrade", icon: Sparkles, label: "Upgrade", requiresCompletion: true },
  { to: "/profile", icon: UserRound, label: "Profile", requiresCompletion: true },
];

const onboardingAllowedPaths = new Set([
  "/profile-completion",
  "/company",
  "/upload",
]);

interface AppLayoutContextValue {
  openMobileMenu: () => void;
}

const AppLayoutContext = createContext<AppLayoutContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAppLayout() {
  const context = useContext(AppLayoutContext);

  if (!context) {
    return {
      openMobileMenu: () => {},
    };
  }

  return context;
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const logoutViewModel = useLogoutViewModel();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [usage, setUsage] = useState<MessageUsage | null>(null);
  const [profileCompletion, setProfileCompletion] =
    useState<ProfileCompletion | null>(null);
  const [completionLoading, setCompletionLoading] = useState(true);

  // useEffect(() => {
  //   const existing = document.getElementById('replymate-widget-script')
  //   if (existing) return

  //   const script = document.createElement('script')
  //   script.id = 'replymate-widget-script'
  //   script.src = 'http://localhost:3000/widget.js'
  //   script.setAttribute('data-key', 'wk_8488cd3447f942748c0736f45a4411f2')
  //   script.setAttribute('data-api', 'http://localhost:3000')
  //   document.body.appendChild(script)
  // }, [])

  useEffect(() => {
    let cancelled = false;

    api
      .get<{ usage: MessageUsage; profileCompletion: ProfileCompletion }>(
        apiRoutes.auth.me,
      )
      .then((response) => {
        if (!cancelled) {
          setUsage(response.data.usage);
          setProfileCompletion(response.data.profileCompletion);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUsage(null);
          setProfileCompletion(null);
        }
      })
      .finally(() => {
        if (!cancelled) setCompletionLoading(false);
      });

    const handleUsageUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<MessageUsage>;
      setUsage(customEvent.detail);
    };

    const handleProfileCompletionUpdated = () => {
      api
        .get<ProfileCompletion>(apiRoutes.profileCompletion.status)
        .then((response) => setProfileCompletion(response.data))
        .catch(() => setProfileCompletion(null));
    };

    window.addEventListener("supportmate-usage-updated", handleUsageUpdated);
    window.addEventListener(
      "supportmate-profile-completion-updated",
      handleProfileCompletionUpdated,
    );

    return () => {
      cancelled = true;
      window.removeEventListener(
        "supportmate-usage-updated",
        handleUsageUpdated,
      );
      window.removeEventListener(
        "supportmate-profile-completion-updated",
        handleProfileCompletionUpdated,
      );
    };
  }, []);

  useEffect(() => {
    if (completionLoading || profileCompletion?.isComplete) return;
    if (onboardingAllowedPaths.has(location.pathname)) return;

    navigate("/profile-completion", { replace: true });
  }, [completionLoading, location.pathname, navigate, profileCompletion]);

  const openMobileMenu = useCallback(() => {
    setMobileMenuOpen(true);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const layoutContext = useMemo(
    () => ({
      openMobileMenu,
    }),
    [openMobileMenu],
  );

  const handleLogout = () => {
    logoutViewModel.logout();
    closeMobileMenu();
    navigate("/login", { replace: true });
  };

  const usagePercent = usage
    ? Math.min((usage.usedMessages / usage.plan.monthlyMessageLimit) * 100, 100)
    : 0;

  const usageLabel = usage
    ? `${usage.usedMessages.toLocaleString()} / ${usage.plan.monthlyMessageLimit.toLocaleString()}`
    : "Loading";

  const completionPercent = profileCompletion?.completionPercent ?? 0;
  const isProfileComplete = Boolean(profileCompletion?.isComplete);
  const visibleNavItems = isProfileComplete
    ? navItems.filter((item) => item.to !== "/profile-completion")
    : navItems;
  const shouldHoldForCompletion =
    completionLoading && !onboardingAllowedPaths.has(location.pathname);

  const guardIncompleteNavigation = (requiresCompletion: boolean) => {
    if (!requiresCompletion || isProfileComplete) return false;

    toast.info("Complete your company info and add one URL or PDF first.");
    closeMobileMenu();
    navigate("/profile-completion");
    return true;
  };

  return (
    <div className="flex h-dvh bg-rm-trip-surface overflow-hidden">
      <aside className="hidden w-64 shrink-0 flex-col bg-white border-r border-gray-100 shadow-rm-trip-card md:flex">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <img src="/favicon.svg" alt="Logo" className="h-9 w-9" />
          <div className="min-w-0">
            <p className="truncate font-rm-trip-heading text-sm font-semibold text-rm-trip-text leading-none">
              SupportMate AI
            </p>
            <p className="mt-0.5 truncate text-xs text-rm-trip-text-muted">
              AI support for your business
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <nav className="flex flex-col gap-1 p-3 pt-4">
            {visibleNavItems.map(({ to, icon: Icon, label, requiresCompletion }) => {
              const locked = Boolean(requiresCompletion && !isProfileComplete);

              return (
              <NavLink
                key={to}
                to={to}
                end={to === "/images"}
                onClick={(event) => {
                  if (guardIncompleteNavigation(Boolean(requiresCompletion))) {
                    event.preventDefault();
                  }
                }}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-rm-trip-smooth px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-rm-trip-brand text-white shadow-rm-trip-card"
                      : locked
                        ? "text-gray-400 hover:bg-gray-50"
                        : "text-rm-trip-text-muted hover:bg-gray-50 hover:text-rm-trip-text",
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-gray-100 p-3">
            <div className="mb-3 rounded-rm-trip-smooth border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                <span className="text-rm-trip-text-muted">
                  Profile completion
                </span>
                <span className="text-rm-trip-text">{completionPercent}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-rm-trip-brand transition-all"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
            <div className="mb-3 rounded-rm-trip-smooth border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                <span className="text-rm-trip-text-muted">
                  Monthly AI messages
                </span>
                <span className="capitalize text-rm-trip-text">
                  {usage?.plan.name ?? "free"}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-3">
                <span className="font-rm-trip-heading text-sm font-semibold text-rm-trip-text">
                  {usageLabel}
                </span>
                <span className="text-[11px] font-medium text-rm-trip-text-muted">
                  used
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-rm-trip-brand transition-all"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-rm-trip-smooth text-sm font-medium text-rm-trip-text-muted hover:text-rm-trip-state-error hover:bg-red-50 transition-all duration-150"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-[3px] md:hidden"
          onClick={closeMobileMenu}
        >
          <div
            className="flex h-full w-80 max-w-[86vw] flex-col rounded-r-[28px] bg-white shadow-[16px_0_60px_rgba(15,23,42,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rm-trip-brand/10">
                  <img src="/favicon.svg" alt="Logo" className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-rm-trip-heading text-base font-semibold leading-none text-rm-trip-text">
                    SupportMate AI
                  </p>
                  <p className="mt-1 truncate text-xs font-medium text-rm-trip-text-muted">
                    Workspace menu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeMobileMenu}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-rm-trip-text-muted transition-all hover:bg-gray-50 hover:text-rm-trip-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-4">
              {visibleNavItems.map(({ to, icon: Icon, label, requiresCompletion }) => {
                const locked = Boolean(requiresCompletion && !isProfileComplete);

                return (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/images"}
                  onClick={(event) => {
                    if (guardIncompleteNavigation(Boolean(requiresCompletion))) {
                      event.preventDefault();
                      return;
                    }
                    closeMobileMenu();
                  }}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all",
                      isActive
                        ? "bg-rm-trip-brand text-white shadow-rm-trip-card"
                        : locked
                          ? "text-gray-400 hover:bg-gray-50"
                          : "text-rm-trip-text-muted hover:bg-gray-50 hover:text-rm-trip-text",
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </NavLink>
                );
              })}
            </nav>
            <div className="border-t border-gray-100 p-4">
              <div className="mb-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                  <span className="text-rm-trip-text-muted">
                    Profile completion
                  </span>
                  <span className="text-rm-trip-text">{completionPercent}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-rm-trip-brand transition-all"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>
              <div className="mb-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                  <span className="text-rm-trip-text-muted">
                    Monthly AI messages
                  </span>
                  <span className="capitalize text-rm-trip-text">
                    {usage?.plan.name ?? "free"}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <span className="font-rm-trip-heading text-sm font-semibold text-rm-trip-text">
                    {usageLabel}
                  </span>
                  <span className="text-[11px] font-medium text-rm-trip-text-muted">
                    used
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-rm-trip-brand transition-all"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold text-rm-trip-text-muted transition-all hover:bg-red-50 hover:text-rm-trip-state-error"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-auto min-h-0">
        <AppLayoutContext.Provider value={layoutContext}>
          {shouldHoldForCompletion ? (
            <div className="flex h-full items-center justify-center bg-rm-trip-surface">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-rm-trip-brand/20 border-t-rm-trip-brand" />
            </div>
          ) : (
            <Outlet />
          )}
        </AppLayoutContext.Provider>
      </main>
    </div>
  );
}
