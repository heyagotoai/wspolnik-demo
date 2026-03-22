import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface ImportantDate {
  id: string
  title: string
  date: string
  description: string | null
}

export default function DatesPage() {
  const [dates, setDates] = useState<ImportantDate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('important_dates')
        .select('id, title, date, description')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (data) setDates(data)
      setLoading(false)
    }
    fetch()
  }, [])

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

      {dates.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
          <p className="text-slate">Brak nadchodzących terminów.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dates.map((d) => (
            <div key={d.id} className="bg-white rounded-[var(--radius-card)] shadow-ambient p-5 flex items-start gap-4">
              <div className="w-14 h-14 rounded-[var(--radius-input)] bg-sage-pale/30 flex flex-col items-center justify-center shrink-0">
                <span className="text-lg font-bold text-sage leading-none">
                  {new Date(d.date).getDate()}
                </span>
                <span className="text-[10px] text-sage uppercase mt-0.5">
                  {new Date(d.date).toLocaleDateString('pl-PL', { month: 'short' })}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-charcoal">{d.title}</h3>
                  <span className="text-xs text-sage bg-sage-pale/30 px-2 py-0.5 rounded-full">
                    {daysUntil(d.date)}
                  </span>
                </div>
                <p className="text-xs text-outline mt-1 capitalize">{formatDate(d.date)}</p>
                {d.description && (
                  <p className="text-sm text-slate mt-2">{d.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
