import { createContext, useCallback, useContext, useMemo, useState } from 'react'
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

interface AppLayoutContextValue {
  openMobileMenu: () => void
}

const AppLayoutContext = createContext<AppLayoutContextValue | null>(null)

export function useAppLayout () {
  const context = useContext(AppLayoutContext)

  if (!context) {
    return {
      openMobileMenu: () => {}
    }
  }

  return context
}

export function AppLayout () {
  const navigate = useNavigate()
  const logoutViewModel = useLogoutViewModel()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const openMobileMenu = useCallback(() => {
    setMobileMenuOpen(true)
  }, [])

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  const layoutContext = useMemo(
    () => ({
      openMobileMenu
    }),
    [openMobileMenu]
  )

  const handleLogout = () => {
    logoutViewModel.logout()
    closeMobileMenu()
    navigate('/login', { replace: true })
  }

  return (
    <div className='flex h-dvh bg-rm-trip-surface overflow-hidden'>
      <aside className='hidden w-64 shrink-0 flex-col bg-white border-r border-gray-100 shadow-rm-trip-card md:flex'>
        <div className='flex items-center gap-3 px-5 py-5 border-b border-gray-100'>
          <img src='/favicon.svg' alt='Logo' className='h-9 w-9' />
          <div className='min-w-0'>
            <p className='truncate font-rm-trip-heading text-sm font-semibold text-rm-trip-text leading-none'>
              SupportMate AI
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

      {mobileMenuOpen && (
        <div className='fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-[3px] md:hidden' onClick={closeMobileMenu}>
          <div
            className='flex h-full w-80 max-w-[86vw] flex-col rounded-r-[28px] bg-white shadow-[16px_0_60px_rgba(15,23,42,0.18)]'
            onClick={(event) => event.stopPropagation()}
          >
            <div className='flex items-center justify-between border-b border-gray-100 px-5 py-5'>
              <div className='flex min-w-0 items-center gap-3'>
                <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rm-trip-brand/10'>
                  <img src='/favicon.svg' alt='Logo' className='h-7 w-7' />
                </div>
                <div className='min-w-0'>
                  <p className='truncate font-rm-trip-heading text-base font-semibold leading-none text-rm-trip-text'>
                    SupportMate AI
                  </p>
                  <p className='mt-1 truncate text-xs font-medium text-rm-trip-text-muted'>
                    Workspace menu
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={closeMobileMenu}
                aria-label='Close menu'
                className='flex h-9 w-9 items-center justify-center rounded-xl text-rm-trip-text-muted transition-all hover:bg-gray-50 hover:text-rm-trip-text'
              >
                <X className='h-4 w-4' />
              </button>
            </div>
            <nav className='flex flex-1 flex-col gap-1.5 overflow-y-auto p-4'>
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/images'}
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all',
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
            <div className='border-t border-gray-100 p-4'>
              <button
                onClick={handleLogout}
                className='flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold text-rm-trip-text-muted transition-all hover:bg-red-50 hover:text-rm-trip-state-error'
              >
                <LogOut className='h-4 w-4 shrink-0' />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className='flex-1 overflow-auto min-h-0'>
        <AppLayoutContext.Provider value={layoutContext}>
          <Outlet />
        </AppLayoutContext.Provider>
      </main>
    </div>
  )
}
