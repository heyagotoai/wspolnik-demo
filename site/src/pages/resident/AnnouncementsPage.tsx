import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { getReadIds, markRead } from '../../lib/readAnnouncements'
import { findResolutionIdByTitle, resolutionTitleFromVotingAnnouncement } from '../../lib/votingAnnouncement'
import { DemoHelpCallout } from '../../demo/DemoHelpCallout'

interface Announcement {
  id: string
  title: string
  content: string
  excerpt: string | null
  is_pinned: boolean
  created_at: string
}

interface ResolutionRow {
  id: string
  title: string
}

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [resolutions, setResolutions] = useState<ResolutionRow[]>([])
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetch = async () => {
      const [{ data }, { data: resData }] = await Promise.all([
        supabase
          .from('announcements')
          .select('id, title, content, excerpt, is_pinned, created_at')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('resolutions').select('id, title'),
      ])

      if (resData) setResolutions(resData as ResolutionRow[])

      if (data && user) {
        const readIds = getReadIds(user.id)
        const unread = new Set(data.filter((a) => !readIds.has(a.id)).map((a) => a.id))

        // Short announcements are fully visible — mark as read immediately
        const shortIds = data.filter((a) => a.content.length <= 200).map((a) => a.id)
        if (shortIds.length > 0) {
          markRead(user.id, shortIds)
          shortIds.forEach((id) => unread.delete(id))
        }

        setUnreadIds(unread)
        setAnnouncements(data)
      } else if (data) {
        setAnnouncements(data)
      }
      setLoading(false)
    }
    fetch()
  }, [user])

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        // Mark as read when user expands a long announcement
        if (user && unreadIds.has(id)) {
          markRead(user.id, [id])
          setUnreadIds((u) => { const s = new Set(u); s.delete(id); return s })
        }
      }
      return next
    })
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate">Ładowanie...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-charcoal">Ogłoszenia</h1>

      <DemoHelpCallout>
        Lista wiadomości od zarządu. Dłuższe teksty rozwijasz kliknięciem — wtedy liczą się jako przeczytane (na pulpicie
        znika licznik „nowych”). W demo to tylko pokaz działania.
      </DemoHelpCallout>

      {announcements.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
          <p className="text-slate">Brak ogłoszeń.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {unreadIds.has(a.id) && (
                      <span className="px-2 py-0.5 bg-sage text-white text-xs font-medium rounded-full">
                        Nowe
                      </span>
                    )}
                    {a.is_pinned && (
                      <span className="px-2 py-0.5 bg-amber-light text-amber text-xs font-medium rounded-full">
                        Ważne
                      </span>
                    )}
                    <span className="text-xs text-outline">{formatDate(a.created_at)}</span>
                  </div>
                  {(() => {
                    const resTitle = resolutionTitleFromVotingAnnouncement(a.title)
                    const resId = resTitle ? findResolutionIdByTitle(resTitle, resolutions) : null
                    if (resId) {
                      return (
                        <h2 className="text-base font-semibold">
                          <Link
                            to={`/panel/glosowania#resolution-${resId}`}
                            className="text-sage hover:text-sage-light"
                          >
                            {a.title}
                          </Link>
                        </h2>
                      )
                    }
                    return <h2 className="text-base font-semibold text-charcoal">{a.title}</h2>
                  })()}
                </div>
              </div>

              <div className="mt-3 text-sm text-slate leading-relaxed">
                {expanded.has(a.id) ? (
                  <p className="whitespace-pre-wrap">{a.content}</p>
                ) : (
                  <p>{a.excerpt || a.content.slice(0, 200)}{a.content.length > 200 ? '...' : ''}</p>
                )}
              </div>

              {a.content.length > 200 && (
                <button
                  onClick={() => toggleExpand(a.id)}
                  className="mt-3 text-sm text-sage hover:text-sage-light font-medium"
                >
                  {expanded.has(a.id) ? 'Zwiń' : 'Czytaj więcej'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
