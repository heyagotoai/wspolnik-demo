import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  LayoutDashboardIcon,
  MegaphoneIcon,
  FolderIcon,
  CalendarIcon,
  WalletIcon,
  LogOutIcon,
  HomeIcon,
} from '../ui/Icons'

const sidebarLinks = [
  { label: 'Pulpit', path: '/panel', icon: LayoutDashboardIcon },
  { label: 'Ogłoszenia', path: '/panel/ogloszenia', icon: MegaphoneIcon },
  { label: 'Dokumenty', path: '/panel/dokumenty', icon: FolderIcon },
  { label: 'Terminy', path: '/panel/terminy', icon: CalendarIcon },
  { label: 'Finanse', path: '/panel/finanse', icon: WalletIcon },
]

export default function ResidentLayout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (path: string) =>
    path === '/panel'
      ? location.pathname === '/panel'
      : location.pathname.startsWith(path)

  return (
    <div className="min-h-screen bg-cream-dark flex">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-cream-medium">
        <div className="px-6 h-[72px] flex items-center border-b border-cream-medium">
          <Link to="/" className="text-sage font-semibold text-lg tracking-tight hover:text-sage-light">
            WM GABI
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarLinks.map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-input)] text-sm font-medium transition-colors ${
                isActive(path)
                  ? 'bg-sage-pale/40 text-sage'
                  : 'text-slate hover:bg-cream hover:text-charcoal'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-cream-medium space-y-1">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-input)] text-sm font-medium text-slate hover:bg-cream hover:text-charcoal transition-colors"
          >
            <HomeIcon className="w-5 h-5" />
            Strona główna
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-input)] text-sm font-medium text-slate hover:bg-error-container hover:text-error transition-colors"
          >
            <LogOutIcon className="w-5 h-5" />
            Wyloguj się
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-[72px] bg-white border-b border-cream-medium px-6 flex items-center justify-between">
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-charcoal"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M6 6l12 12M6 18L18 6" />
              ) : (
                <path d="M3 6h18M3 12h18M3 18h18" />
              )}
            </svg>
          </button>

          <div className="hidden md:block" />

          <p className="text-sm text-slate">
            {user?.email}
          </p>
        </header>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden bg-white border-b border-cream-medium px-4 py-3 space-y-1">
            {sidebarLinks.map(({ label, path, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-input)] text-sm font-medium ${
                  isActive(path) ? 'bg-sage-pale/40 text-sage' : 'text-slate'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            ))}
            <hr className="border-cream-medium my-2" />
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate"
            >
              <HomeIcon className="w-5 h-5" />
              Strona główna
            </Link>
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate hover:text-error"
            >
              <LogOutIcon className="w-5 h-5" />
              Wyloguj się
            </button>
          </nav>
        )}

        {/* Page content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
