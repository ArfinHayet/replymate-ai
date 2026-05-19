import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Building2,
  ChartColumn,
  Code2,
  FileUp,
  Files,
  Globe,
  History,
  Images,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  UserRound,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLogoutViewModel } from '@/features/auth/viewModel/useLogoutViewModel'

const navItems = [
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/upload', icon: FileUp, label: 'Add Content' },
  { to: '/pdfs', icon: Files, label: 'Documents' },
  { to: '/web-pages', icon: Globe, label: 'Web Pages' },
  { to: '/images', icon: Images, label: 'Images' },
  { to: '/company', icon: Building2, label: 'Company' },
  { to: '/analytics', icon: ChartColumn, label: 'Analytics' },
  { to: '/chat-history', icon: History, label: 'Chat History' },
  { to: '/embed', icon: Code2, label: 'Website Widget' },
  { to: '/profile', icon: UserRound, label: 'Profile' }
]

const mobilePrimaryItems = navItems.filter((item) =>
  ['/chat', '/upload', '/pdfs', '/company'].includes(item.to)
)
const mobileMoreItems = navItems.filter((item) => !mobilePrimaryItems.includes(item))

export function AppLayout () {
  const navigate = useNavigate()
  const logoutViewModel = useLogoutViewModel()
  const [moreOpen, setMoreOpen] = useState(false)

  const handleLogout = () => {
    logoutViewModel.logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className='flex h-dvh bg-rm-trip-surface overflow-hidden'>
      <aside className='hidden w-64 shrink-0 flex-col bg-white border-r border-gray-100 shadow-rm-trip-card md:flex'>
        <div className='flex items-center gap-3 px-5 py-5 border-b border-gray-100'>
          <img src='/favicon.svg' alt='Logo' className='h-9 w-9' />
          <div className='min-w-0'>
            <p className='truncate font-rm-trip-heading text-sm font-semibold text-rm-trip-text leading-none'>
              ReplyMate AI
            </p>
            <p className='mt-0.5 truncate text-xs text-rm-trip-text-muted'>
              AI support for your business
            </p>
          </div>
        </div>

        <nav className='flex flex-col gap-1 p-3 flex-1 pt-4'>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/images'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-rm-trip-smooth px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-rm-trip-brand text-white shadow-rm-trip-card'
                    : 'text-rm-trip-text-muted hover:bg-gray-50 hover:text-rm-trip-text'
                )
              }
            >
              <Icon className='h-4 w-4 shrink-0' />
              <span className='truncate'>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className='p-3 border-t border-gray-100'>
          <button
            onClick={handleLogout}
            className='w-full flex items-center gap-3 px-3 py-2.5 rounded-rm-trip-smooth text-sm font-medium text-rm-trip-text-muted hover:text-rm-trip-state-error hover:bg-red-50 transition-all duration-150'
          >
            <LogOut className='h-4 w-4 shrink-0' />
            Sign out
          </button>
        </div>
      </aside>

      {moreOpen && (
        <div className='fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] md:hidden' onClick={() => setMoreOpen(false)}>
          <div
            className='absolute inset-x-3 bottom-20 rounded-rm-trip-smooth border border-gray-100 bg-white p-2 shadow-rm-trip-lift'
            onClick={(event) => event.stopPropagation()}
          >
            <div className='flex items-center justify-between px-2 py-2'>
              <p className='text-sm font-semibold text-rm-trip-text'>More</p>
              <button
                type='button'
                onClick={() => setMoreOpen(false)}
                className='flex h-8 w-8 items-center justify-center rounded-rm-trip-smooth text-rm-trip-text-muted hover:bg-gray-50 hover:text-rm-trip-text'
              >
                <X className='h-4 w-4' />
              </button>
            </div>
            <nav className='grid grid-cols-2 gap-1'>
              {mobileMoreItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/images'}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-rm-trip-smooth px-3 py-2.5 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-rm-trip-brand text-white'
                        : 'text-rm-trip-text-muted hover:bg-gray-50 hover:text-rm-trip-text'
                    )
                  }
                >
                  <Icon className='h-4 w-4 shrink-0' />
                  <span className='truncate'>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      <div className='fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 px-2 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden'>
        <nav className='grid grid-cols-5 items-center gap-1'>
          {mobilePrimaryItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              title={label}
              className={({ isActive }) =>
                cn(
                  'group relative flex min-w-0 items-center justify-center rounded-rm-trip-smooth px-1.5 py-3 text-[11px] font-medium transition-all',
                  isActive
                    ? 'bg-rm-trip-brand text-white'
                    : 'text-rm-trip-text-muted hover:bg-gray-50 hover:text-rm-trip-text'
                )
              }
            >
              <Icon className='h-4 w-4 shrink-0' />
              <span className='pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-rm-trip-smooth bg-gray-950 px-2 py-1 text-xs font-semibold text-white opacity-0 shadow-rm-trip-card transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100'>
                {label}
              </span>
            </NavLink>
          ))}
          <button
            type='button'
            onClick={() => setMoreOpen((open) => !open)}
            aria-label='More'
            title='More'
            className={cn(
              'group relative flex min-w-0 items-center justify-center rounded-rm-trip-smooth px-1.5 py-3 text-[11px] font-medium transition-all',
              moreOpen ? 'bg-rm-trip-brand text-white' : 'text-rm-trip-text-muted hover:bg-gray-50 hover:text-rm-trip-text'
            )}
          >
            <MoreHorizontal className='h-4 w-4 shrink-0' />
            <span className='pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-rm-trip-smooth bg-gray-950 px-2 py-1 text-xs font-semibold text-white opacity-0 shadow-rm-trip-card transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100'>
              More
            </span>
          </button>
        </nav>
      </div>

      <main className='flex-1 overflow-auto min-h-0 pb-20 md:pb-0'>
        <Outlet />
      </main>
    </div>
  )
}
