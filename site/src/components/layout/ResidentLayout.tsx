import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useRole } from '../../hooks/useRole'
import { logoAlt, logoSrc } from '../../demo/demoAssets'
import { communityInfo } from '../../data/mockData'
import { useDemoBasePath } from '../../demo/useDemoBasePath'
import { DemoBanner } from '../../demo/DemoBanner'
import {
  LayoutDashboardIcon,
  MegaphoneIcon,
  FolderIcon,
  CalendarIcon,
  WalletIcon,
  VoteIcon,
  LogOutIcon,
  HomeIcon,
  SettingsIcon,
  UserIcon,
  MailIcon,
} from '../ui/Icons'

const sidebarLinks = [
  { label: 'Pulpit', path: '/panel', icon: LayoutDashboardIcon },
  { label: 'Ogłoszenia', path: '/panel/ogloszenia', icon: MegaphoneIcon },
  { label: 'Dokumenty', path: '/panel/dokumenty', icon: FolderIcon },
  { label: 'Terminy', path: '/panel/terminy', icon: CalendarIcon },
  { label: 'Finanse', path: '/panel/finanse', icon: WalletIcon },
  { label: 'Głosowania', path: '/panel/glosowania', icon: VoteIcon },
  { label: 'Kontakt', path: '/kontakt', icon: MailIcon },
]

export default function ResidentLayout() {
  const { user, signOut } = useAuth()
  const { isAdmin, isAdminOrManager } = useRole()
  const location = useLocation()
  const prefix = useDemoBasePath()
  const to = (path: string) => (prefix ? `${prefix}${path}` : path)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (path: string) => {
    const full = to(path)
    return path === '/panel'
      ? location.pathname === full
      : location.pathname.startsWith(full)
  }

  return (
    <div className="min-h-screen bg-cream-dark flex">
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white border-r border-cream-medium sticky top-0 h-screen">
        <div className="px-6 h-[72px] flex items-center border-b border-cream-medium shrink-0">
          <Link to={prefix || '/'} className="flex items-center gap-2 text-sage font-semibold text-lg tracking-tight hover:text-sage-light">
            <img src={logoSrc()} alt={logoAlt()} className="h-12 w-12 object-contain" />
            {communityInfo.shortName}
          </Link>
        </div>

        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto px-3 py-4">
          <nav className="space-y-1">
            {sidebarLinks.map(({ label, path, icon: Icon }) => (
              <Link
                key={path}
                to={to(path)}
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

          <div className="border-t border-cream-medium pt-4 mt-4 space-y-1">
            <Link
              to={to('/panel/profil')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-input)] text-sm font-medium transition-colors ${
                isActive('/panel/profil')
                  ? 'bg-sage-pale/40 text-sage'
                  : 'text-slate hover:bg-cream hover:text-charcoal'
              }`}
            >
              <UserIcon className="w-5 h-5" />
              Mój profil
            </Link>
            {isAdminOrManager && (
              <Link
                to={to('/admin')}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-input)] text-sm font-medium text-amber hover:bg-amber-light/30 transition-colors"
              >
                <SettingsIcon className="w-5 h-5" />
                {isAdmin ? 'Panel admina' : 'Panel zarządcy'}
              </Link>
            )}
            <Link
              to={prefix || '/'}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-input)] text-sm font-medium text-slate hover:bg-cream hover:text-charcoal transition-colors"
            >
              <HomeIcon className="w-5 h-5" />
              Strona główna
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-input)] text-sm font-medium text-slate hover:bg-error-container hover:text-error transition-colors"
            >
              <LogOutIcon className="w-5 h-5" />
              Wyloguj się
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
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

          <p className="text-sm text-slate">
            {user?.email}
          </p>
        </header>

        {mobileOpen && (
          <nav className="md:hidden bg-white border-b border-cream-medium px-4 py-3 space-y-1">
            {sidebarLinks.map(({ label, path, icon: Icon }) => (
              <Link
                key={path}
                to={to(path)}
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
              to={to('/panel/profil')}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium ${
                isActive('/panel/profil') ? 'bg-sage-pale/40 text-sage' : 'text-slate'
              }`}
            >
              <UserIcon className="w-5 h-5" />
              Mój profil
            </Link>
            {isAdminOrManager && (
              <Link
                to={to('/admin')}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-amber"
              >
                <SettingsIcon className="w-5 h-5" />
                {isAdmin ? 'Panel admina' : 'Panel zarządcy'}
              </Link>
            )}
            <Link
              to={prefix || '/'}
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

        <main className="flex-1 p-6">
          <DemoBanner />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
