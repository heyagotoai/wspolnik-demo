import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { navLinks, communityInfo } from '../../data/mockData'

export default function Header() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-cream/80 backdrop-blur-xl">
      <div className="mx-auto max-w-[1280px] px-6 flex items-center justify-between h-[72px]">
        <Link to="/" className="text-sage font-semibold text-xl tracking-tight hover:text-sage-light">
          {communityInfo.name}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm font-medium tracking-wide uppercase transition-colors ${
                location.pathname === link.path
                  ? 'text-sage border-b-2 border-sage pb-1'
                  : 'text-slate hover:text-sage'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

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
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="md:hidden bg-white/95 backdrop-blur-xl border-t border-cream-medium px-6 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileOpen(false)}
              className={`block text-sm font-medium uppercase tracking-wide py-2 ${
                location.pathname === link.path ? 'text-sage' : 'text-slate'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
