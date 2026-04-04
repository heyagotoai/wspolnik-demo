import { useEffect, useState } from 'react'
import {
  loadPublicAnnouncementsForDisplay,
  announcementPreview,
  type PublicAnnouncementRow,
} from '../lib/loadPublicAnnouncements'
import TextWithAutoLinks from '../components/ui/TextWithAutoLinks'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function NewsPage() {
  const [announcements, setAnnouncements] = useState<PublicAnnouncementRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const { announcements: ann } = await loadPublicAnnouncementsForDisplay()
        if (!cancelled) setAnnouncements(ann)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const pinned = announcements.filter((a) => a.is_pinned)
  const regular = announcements.filter((a) => !a.is_pinned)

  return (
    <>
      <section className="bg-cream-dark">
        <div className="mx-auto max-w-[1280px] px-6 py-20">
          <h1 className="text-4xl md:text-5xl font-semibold text-charcoal tracking-tight">
            Aktualności
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-6 py-20">
        {loading && (
          <p className="text-sm text-slate mb-8" aria-live="polite">
            Ładowanie…
          </p>
        )}

        <div className="max-w-3xl space-y-8">
          {!loading && announcements.length === 0 && (
            <p className="text-slate bg-white rounded-[24px] p-8 shadow-[0_12px_32px_rgba(45,52,54,0.05)]">
              Brak ogłoszeń.
            </p>
          )}

          {pinned.map((item) => (
            <article
              key={item.id}
              className="bg-white rounded-[24px] p-8 shadow-[0_12px_32px_rgba(45,52,54,0.05)] border-l-4 border-amber-container"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber bg-amber-light rounded-full px-3 py-1">
                  Ważne
                </span>
                <span className="text-xs text-outline">{formatDate(item.created_at)}</span>
              </div>
              <h2 className="text-xl font-semibold text-charcoal mb-3">{item.title}</h2>
              <p className="text-slate leading-relaxed">
                <TextWithAutoLinks text={announcementPreview(item)} />
              </p>
            </article>
          ))}

          {regular.map((item) => (
            <article
              key={item.id}
              className="bg-white rounded-[24px] p-7 shadow-[0_12px_32px_rgba(45,52,54,0.05)]"
            >
              <span className="inline-block text-xs font-medium text-white bg-sage rounded-full px-3 py-1 mb-4">
                {formatDate(item.created_at)}
              </span>
              <h3 className="text-lg font-semibold text-charcoal mb-2">{item.title}</h3>
              <p className="text-sm text-slate leading-relaxed">
                <TextWithAutoLinks text={announcementPreview(item)} />
              </p>
            </article>
          ))}
        </div>
      </div>
    </>
  )
}
