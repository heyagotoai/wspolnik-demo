import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Announcement {
  id: string
  title: string
  content: string
  excerpt: string | null
  is_pinned: boolean
  created_at: string
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('id, title, content, excerpt, is_pinned, created_at')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (data) setAnnouncements(data)
      setLoading(false)
    }
    fetch()
  }, [])

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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
                    {a.is_pinned && (
                      <span className="px-2 py-0.5 bg-amber-light text-amber text-xs font-medium rounded-full">
                        Ważne
                      </span>
                    )}
                    <span className="text-xs text-outline">{formatDate(a.created_at)}</span>
                  </div>
                  <h2 className="text-base font-semibold text-charcoal">{a.title}</h2>
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
