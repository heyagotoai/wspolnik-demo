import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useRole } from '../../hooks/useRole'
import {
  LayoutDashboardIcon,
  UsersIcon,
  HomeIcon,
  MegaphoneIcon,
  FolderIcon,
  CalendarIcon,
  WalletIcon,
  MailIcon,
  VoteIcon,
  ShieldIcon,
  LogOutIcon,
  UserIcon,
} from '../ui/Icons'

const allSidebarLinks = [
  { label: 'Pulpit', path: '/admin', icon: LayoutDashboardIcon, adminOnly: false },
  { label: 'Lokale', path: '/admin/lokale', icon: HomeIcon, adminOnly: false },
  { label: 'Naliczenia', path: '/admin/naliczenia', icon: WalletIcon, adminOnly: false },
  { label: 'Mieszkańcy', path: '/admin/mieszkancy', icon: UsersIcon, adminOnly: true },
  { label: 'Uchwały', path: '/admin/uchwaly', icon: VoteIcon, adminOnly: false },
  { label: 'Dokumenty', path: '/admin/dokumenty', icon: FolderIcon, adminOnly: false },
  { label: 'Terminy', path: '/admin/terminy', icon: CalendarIcon, adminOnly: false },
  { label: 'Ogłoszenia', path: '/admin/ogloszenia', icon: MegaphoneIcon, adminOnly: false },
  { label: 'Wiadomości', path: '/admin/wiadomosci', icon: MailIcon, adminOnly: false },
  { label: 'Dziennik operacji', path: '/admin/dziennik', icon: ShieldIcon, adminOnly: false },
]

export default function AdminLayout() {
  const { user, signOut } = useAuth()
  const { isAdmin } = useRole()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebarLinks = allSidebarLinks.filter(link => !link.adminOnly || isAdmin)
  const roleLabel = isAdmin ? 'Admin' : 'Zarządca'

  const isActive = (path: string) =>
    path === '/admin'
      ? location.pathname === '/admin'
      : location.pathname.startsWith(path)

  return (
    <div className="min-h-screen bg-cream-dark flex">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-cream-medium">
        <div className="px-6 h-[72px] flex items-center border-b border-cream-medium">
          <Link to="/" className="flex items-center gap-2 text-sage font-semibold text-lg tracking-tight hover:text-sage-light">
            <img src="/logo.png" alt="WM GABI" className="h-8 w-8 object-contain" />
            WM GABI
          </Link>
          <span className="ml-2 px-2 py-0.5 bg-amber-light text-amber text-[10px] font-bold rounded-full uppercase tracking-wider">
            {roleLabel}
          </span>
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
            to="/panel"
            className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-input)] text-sm font-medium text-slate hover:bg-cream hover:text-charcoal transition-colors"
          >
            <UserIcon className="w-5 h-5" />
            Panel mieszkańca
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

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-light text-amber text-xs font-medium rounded-full">{roleLabel}</span>
            <p className="text-sm text-slate">{user?.email}</p>
          </div>
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
              to="/panel"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate"
            >
              <HomeIcon className="w-5 h-5" />
              Panel mieszkańca
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
