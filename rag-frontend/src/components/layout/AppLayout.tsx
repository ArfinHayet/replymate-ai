import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { FileUp, Files, MessageSquare, Bot, Building2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { logout } from "@/lib/api";

const navItems = [
  { to: "/upload", icon: FileUp, label: "Upload PDF" },
  { to: "/pdfs", icon: Files, label: "Manage PDFs" },
  { to: "/company", icon: Building2, label: "Company" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
];

export function AppLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-screen bg-rm-trip-surface overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-60 flex flex-col shrink-0 bg-white border-r border-gray-100 shadow-rm-trip-card">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-rm-trip-smooth bg-rm-trip-brand shadow-rm-trip-glow">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-rm-trip-heading text-sm font-bold text-rm-trip-text leading-none">RAG Admin</p>
            <p className="text-xs text-rm-trip-text-muted mt-0.5">Knowledge Base</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 p-3 flex-1 pt-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-rm-trip-smooth px-3 py-2.5 text-sm font-semibold transition-all duration-150",
                  isActive
                    ? "bg-rm-trip-brand text-white shadow-rm-trip-card"
                    : "text-rm-trip-text-muted hover:bg-gray-50 hover:text-rm-trip-text",
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-rm-trip-smooth text-sm font-semibold text-rm-trip-text-muted hover:text-rm-trip-state-error hover:bg-red-50 transition-all duration-150"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto min-h-0">
        <Outlet />
      </main>

      <Toaster />
    </div>
  );
}
