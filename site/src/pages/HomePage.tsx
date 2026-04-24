import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { heroBuildingAlt, heroBuildingSrc } from '../demo/demoAssets'
import {
  loadPublicAnnouncementsForDisplay,
  announcementPreview,
  type PublicAnnouncementRow,
} from '../lib/loadPublicAnnouncements'
import { ArrowRightIcon } from '../components/ui/Icons'
import TextWithAutoLinks from '../components/ui/TextWithAutoLinks'

const HOME_PREVIEW_LIMIT = 6

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function HomePage() {
  const [items, setItems] = useState<PublicAnnouncementRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const { announcements } = await loadPublicAnnouncementsForDisplay()
        if (!cancelled) setItems(announcements.slice(0, HOME_PREVIEW_LIMIT))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <section className="relative min-h-[85vh] flex flex-col md:flex-row overflow-hidden">
        <div className="relative w-full md:w-[50%] flex items-center bg-cream-dark px-8 md:px-16 lg:px-24 py-20 md:py-0 z-20">
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.08]"
            style={{ backgroundImage: 'radial-gradient(circle, #6B8F71 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          />
          <div className="absolute -right-32 top-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-sage-pale/20 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-charcoal tracking-tight leading-[0.95] mb-8">
              Witamy w naszej{' '}
              <span className="text-sage">wspólnocie</span>
            </h1>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/logowanie"
                className="px-8 py-4 bg-sage text-white rounded-full font-semibold text-sm shadow-lg shadow-sage/10 hover:shadow-sage/20 hover:bg-sage-light transition-all active:scale-95"
              >
                Zaloguj się
              </Link>
              <a
                href="#aktualnosci"
                className="px-8 py-4 border-2 border-sage text-sage rounded-full font-semibold text-sm hover:bg-sage/5 transition-all active:scale-95"
              >
                Aktualności
              </a>
              <Link
                to={
                  import.meta.env.VITE_DEMO_ONLY === 'true' ||
                  import.meta.env.VITE_PUBLIC_DEMO_ROUTES === 'true'
                    ? '/panel'
                    : '/demo'
                }
                className="px-8 py-4 bg-charcoal/90 text-white rounded-full font-semibold text-sm hover:bg-charcoal transition-all active:scale-95"
              >
                Tryb demonstracyjny
              </Link>
              <Link
                to="/kontakt"
                className="px-8 py-4 border-2 border-sage text-sage rounded-full font-semibold text-sm hover:bg-sage/5 transition-all active:scale-95"
              >
                Kontakt
              </Link>
            </div>
          </div>
        </div>

        <div className="relative w-full md:w-[50%] min-h-[300px] md:min-h-0">
          <div className="absolute top-0 -left-px h-full w-40 bg-gradient-to-r from-cream-dark via-cream-dark/20 to-transparent z-30 hidden md:block" />
          <img
            src={heroBuildingSrc()}
            alt={heroBuildingAlt()}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-cream-dark/40 via-transparent to-transparent hidden md:block" />
          <div className="absolute inset-0 bg-gradient-to-t from-cream-dark/80 via-transparent to-transparent md:hidden" />
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-sage opacity-60 z-40 hidden md:flex">
          <span className="text-[10px] font-bold tracking-widest uppercase">Przewiń</span>
          <div className="w-px h-10 bg-sage/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-sage animate-bounce" />
          </div>
        </div>
      </section>

      <section id="aktualnosci" className="mx-auto max-w-[1280px] px-6 py-20 scroll-mt-8">
        <div className="flex items-end justify-between mb-10 gap-4">
          <h2 className="text-3xl font-semibold text-charcoal">Aktualności</h2>
          <Link
            to="/aktualnosci"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-sage hover:gap-3 transition-all shrink-0"
          >
            Wszystkie wpisy <ArrowRightIcon />
          </Link>
        </div>

        {loading && (
          <p className="text-sm text-slate py-8" aria-live="polite">
            Ładowanie ogłoszeń…
          </p>
        )}

        {!loading && items.length === 0 && (
          <p className="text-sm text-slate py-8 bg-white rounded-[24px] px-7 shadow-[0_12px_32px_rgba(45,52,54,0.05)]">
            Brak ogłoszeń do wyświetlenia.
          </p>
        )}

        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item) => (
              <article
                key={item.id}
                className={`bg-white rounded-[24px] p-7 shadow-[0_12px_32px_rgba(45,52,54,0.05)] ${
                  item.is_pinned ? 'ring-2 ring-amber-container/60 border-l-4 border-amber-container' : ''
                }`}
              >
                {item.is_pinned && (
                  <span className="inline-block text-xs font-semibold uppercase tracking-wider text-amber bg-amber-light rounded-full px-3 py-1 mb-3">
                    Ważne
                  </span>
                )}
                <span className="inline-block text-xs font-medium text-white bg-sage rounded-full px-3 py-1 mb-4">
                  {formatDate(item.created_at)}
                </span>
                <h3 className="text-base font-semibold text-charcoal mb-3">{item.title}</h3>
                <p className="text-sm text-slate line-clamp-4">
                  <TextWithAutoLinks text={announcementPreview(item)} />
                </p>
              </article>
            ))}
          </div>
        )}

        <Link
          to="/aktualnosci"
          className="sm:hidden mt-8 inline-flex items-center gap-2 text-sm font-medium text-sage"
        >
          Wszystkie wpisy <ArrowRightIcon />
        </Link>
      </section>
    </>
  )
}
