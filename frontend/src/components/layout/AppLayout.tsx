import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import {
  FileUp,
  Files,
  MessageSquare,
  History,
  Building2,
  LogOut,
  Code2,
  Images,
  UserRound,
  Globe
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/sonner'
import { logout } from '@/lib/api'

const navItems = [
  { to: '/upload', icon: FileUp, label: 'Upload Knowledge' },
  { to: '/pdfs', icon: Files, label: 'Manage PDFs' },
  { to: '/web-pages', icon: Globe, label: 'Web Pages' },
  { to: '/images', icon: Images, label: 'Images' },
  { to: '/company', icon: Building2, label: 'Company' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/chat-history', icon: History, label: 'Chat History' },
  { to: '/embed', icon: Code2, label: 'Embed Widget' },
  { to: '/profile', icon: UserRound, label: 'Profile' }
]

export function AppLayout () {
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className='flex h-dvh bg-rm-trip-surface overflow-hidden'>
      {/* ── Sidebar ── */}
      <aside className='hidden w-64 shrink-0 flex-col bg-white border-r border-gray-100 shadow-rm-trip-card md:flex'>
        {/* Logo */}
        <div className='flex items-center gap-3 px-5 py-5 border-b border-gray-100'>
          <img src='/favicon.svg' alt='Logo' className='h-9 w-9' />
          <div>
            <p className='font-rm-trip-heading text-sm font-bold text-rm-trip-text leading-none'>
              ReplyMate Ai
            </p>
            <p className='text-xs text-rm-trip-text-muted mt-0.5'>
              Your personal AI assistant
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className='flex flex-col gap-1 p-3 flex-1 pt-4'>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/images'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-rm-trip-smooth px-3 py-2.5 text-sm font-semibold transition-all duration-150',
                  isActive
                    ? 'bg-rm-trip-brand text-white shadow-rm-trip-card'
                    : 'text-rm-trip-text-muted hover:bg-gray-50 hover:text-rm-trip-text'
                )
              }
            >
              <Icon className='h-4 w-4 shrink-0' />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className='p-3 border-t border-gray-100'>
          <button
            onClick={handleLogout}
            className='w-full flex items-center gap-3 px-3 py-2.5 rounded-rm-trip-smooth text-sm font-semibold text-rm-trip-text-muted hover:text-rm-trip-state-error hover:bg-red-50 transition-all duration-150'
          >
            <LogOut className='h-4 w-4 shrink-0' />
            Sign Out
          </button>
        </div>
      </aside>

      <div className='fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 px-2 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden'>
        <nav className='flex items-center gap-1 overflow-x-auto'>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/images'}
              className={({ isActive }) =>
                cn(
                  'flex min-w-[72px] flex-col items-center gap-1 rounded-rm-trip-smooth px-2 py-2 text-[11px] font-semibold transition-all',
                  isActive
                    ? 'bg-rm-trip-brand text-white'
                    : 'text-rm-trip-text-muted hover:bg-gray-50 hover:text-rm-trip-text'
                )
              }
            >
              <Icon className='h-4 w-4 shrink-0' />
              <span className='max-w-full truncate'>
                {label.replace(' Knowledge', '')}
              </span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* ── Main content ── */}
      <main className='flex-1 overflow-auto min-h-0 pb-20 md:pb-0'>
        <Outlet />
      </main>

      <Toaster />
    </div>
  )
}
