import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { DemoHelpCallout } from '../../demo/DemoHelpCallout'

interface DateEntry {
  id: string
  title: string
  date: string
  description: string | null
  kind: 'date' | 'voting'
}

export default function DatesPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<DateEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      const today = new Date().toISOString().split('T')[0]

      const [datesRes, resRes] = await Promise.all([
        supabase
          .from('important_dates')
          .select('id, title, date, description')
          .gte('date', today)
          .order('date', { ascending: true }),
        supabase
          .from('resolutions')
          .select('id, title, voting_end')
          .eq('status', 'voting')
          .not('voting_end', 'is', null)
          .gte('voting_end', today),
      ])

      const result: DateEntry[] = []

      if (datesRes.data) {
        for (const d of datesRes.data) {
          result.push({ ...d, kind: 'date' })
        }
      }

      if (resRes.data?.length && user) {
        const { data: votes } = await supabase
          .from('votes')
          .select('resolution_id')
          .eq('resident_id', user.id)
          .in('resolution_id', resRes.data.map((r) => r.id))

        const votedIds = new Set((votes || []).map((v) => v.resolution_id))

        for (const r of resRes.data) {
          if (!votedIds.has(r.id)) {
            result.push({
              id: r.id,
              title: `Koniec głosowania: ${r.title}`,
              date: r.voting_end!,
              description: 'Nie oddałeś jeszcze głosu w tej uchwale.',
              kind: 'voting',
            })
          }
        }
      }

      result.sort((a, b) => a.date.localeCompare(b.date))
      setEntries(result)
      setLoading(false)
    }

    fetchAll()
  }, [user])

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pl-PL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  const daysUntil = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Dziś'
    if (diff === 1) return 'Jutro'
    return `Za ${diff} dni`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate">Ładowanie...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-charcoal">Ważne terminy</h1>

      <DemoHelpCallout>
        Zbliżające się wydarzenia wspólnoty oraz — jeśli jesteś w trakcie głosowania — przypomnienie o końcu terminu na
        oddanie głosu w uchwale.
      </DemoHelpCallout>

      {entries.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
          <p className="text-slate">Brak nadchodzących terminów.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((d) => (
            <div
              key={`${d.kind}-${d.id}`}
              className={`bg-white rounded-[var(--radius-card)] shadow-ambient p-5 flex items-start gap-4 ${
                d.kind === 'voting' ? 'border-l-4 border-error' : ''
              }`}
            >
              <div
                className={`w-14 h-14 rounded-[var(--radius-input)] flex flex-col items-center justify-center shrink-0 ${
                  d.kind === 'voting' ? 'bg-error-container' : 'bg-sage-pale/30'
                }`}
              >
                <span
                  className={`text-lg font-bold leading-none ${
                    d.kind === 'voting' ? 'text-error' : 'text-sage'
                  }`}
                >
                  {new Date(d.date).getDate()}
                </span>
                <span
                  className={`text-[10px] uppercase mt-0.5 ${
                    d.kind === 'voting' ? 'text-error' : 'text-sage'
                  }`}
                >
                  {new Date(d.date).toLocaleDateString('pl-PL', { month: 'short' })}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-charcoal">{d.title}</h3>
                  {d.kind === 'voting' && (
                    <span className="text-xs text-error bg-error-container px-2 py-0.5 rounded-full font-medium">
                      Głosowanie
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      d.kind === 'voting'
                        ? 'text-error bg-error-container'
                        : 'text-sage bg-sage-pale/30'
                    }`}
                  >
                    {daysUntil(d.date)}
                  </span>
                </div>
                <p className="text-xs text-outline mt-1 capitalize">{formatDate(d.date)}</p>
                {d.description && (
                  <p className="text-sm text-slate mt-2">{d.description}</p>
                )}
                {d.kind === 'voting' && (
                  <Link
                    to="/panel/glosowania"
                    className="inline-block mt-2 text-xs text-error font-medium hover:underline"
                  >
                    Przejdź do głosowania →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
