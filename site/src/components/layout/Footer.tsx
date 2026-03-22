import { Link } from 'react-router-dom'
import { communityInfo, navLinks } from '../../data/mockData'

export default function Footer() {
  return (
    <footer className="bg-cream-dark mt-auto">
      <div className="mx-auto max-w-[1280px] px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 justify-items-center text-center">
          {/* Legal docs */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-charcoal mb-4">
              Dokumenty prawne
            </h4>
            <nav className="space-y-2">
              <a href="/docs/polityka-prywatnosci.pdf" target="_blank" rel="noopener noreferrer" className="block text-sm text-slate hover:text-sage transition-colors">Polityka prywatności</a>
              <a href="/docs/klauzula-rodo.pdf" target="_blank" rel="noopener noreferrer" className="block text-sm text-slate hover:text-sage transition-colors">Klauzula informacyjna RODO</a>
              <a href="/docs/regulamin-wspolnoty.pdf" target="_blank" rel="noopener noreferrer" className="block text-sm text-slate hover:text-sage transition-colors">Regulamin wspólnoty</a>
            </nav>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-charcoal mb-4">
              Nawigacja
            </h4>
            <nav className="space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="block text-sm text-slate hover:text-sage transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-charcoal mb-4">
              Kontakt
            </h4>
            <div className="space-y-2 text-sm text-slate">
              <p>{communityInfo.address}</p>
              <p>{communityInfo.city}</p>
              <a
                href={`mailto:${communityInfo.email}`}
                className="block text-sage hover:text-sage-light"
              >
                {communityInfo.email}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-cream-medium text-center text-xs text-outline">
          &copy; {new Date().getFullYear()} {communityInfo.name}. Wszelkie prawa zastrzeżone.
        </div>
      </div>
    </footer>
  )
}
