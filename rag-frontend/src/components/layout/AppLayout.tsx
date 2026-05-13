import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { FileUp, Files, MessageSquare, Bot, Building2, LogOut, Code2, ImageUp, Images } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/sonner'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { logout } from '@/lib/api'

const navItems = [
  { to: '/upload', icon: FileUp, label: 'Upload PDF' },
  { to: '/pdfs', icon: Files, label: 'Manage PDFs' },
  { to: '/images/upload', icon: ImageUp, label: 'Upload Image' },
  { to: '/images', icon: Images, label: 'Images' },
  { to: '/company', icon: Building2, label: 'Company' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/embed', icon: Code2, label: 'Embed Widget' },
]

export function AppLayout() {
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-card flex flex-col shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">RAG Admin</p>
            <p className="text-xs text-muted-foreground mt-0.5">Knowledge Base</p>
          </div>
        </div>

        <Separator />

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 p-2 flex-1 pt-3">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/images'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <Separator />
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto min-h-0">
        <Outlet />
      </main>

      <Toaster />
    </div>
  )
}
