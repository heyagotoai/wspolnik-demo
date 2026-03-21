import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { MegaphoneIcon, CalendarIcon, FolderIcon, WalletIcon, ArrowRightIcon } from '../../components/ui/Icons'

interface Announcement {
  id: string
  title: string
  excerpt: string | null
  is_pinned: boolean
  created_at: string
}

interface ImportantDate {
  id: string
  title: string
  date: string
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dates, setDates] = useState<ImportantDate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [annRes, datesRes] = await Promise.all([
        supabase
          .from('announcements')
          .select('id, title, excerpt, is_pinned, created_at')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('important_dates')
          .select('id, title, date')
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true })
          .limit(5),
      ])

      if (annRes.data) setAnnouncements(annRes.data)
      if (datesRes.data) setDates(datesRes.data)
      setLoading(false)
    }

    fetchData()
  }, [])

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
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Witaj{user?.email ? `, ${user.email.split('@')[0]}` : ''}!</h1>
        <p className="text-slate mt-1">Panel mieszkańca — Wspólnota Mieszkaniowa GABI</p>
      </div>

      {/* Quick stats / cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          icon={<MegaphoneIcon className="w-6 h-6" />}
          label="Ogłoszenia"
          value={announcements.length > 0 ? `${announcements.length} nowe` : 'Brak'}
          to="/panel/ogloszenia"
        />
        <DashboardCard
          icon={<CalendarIcon className="w-6 h-6" />}
          label="Najbliższy termin"
          value={dates.length > 0 ? formatDate(dates[0].date) : 'Brak'}
          to="/panel/terminy"
        />
        <DashboardCard
          icon={<FolderIcon className="w-6 h-6" />}
          label="Dokumenty"
          value="Przeglądaj"
          to="/panel/dokumenty"
        />
        <DashboardCard
          icon={<WalletIcon className="w-6 h-6" />}
          label="Finanse"
          value="Wkrótce"
          to="/panel/finanse"
          disabled
        />
      </div>

      {/* Announcements + Important dates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Announcements */}
        <div className="lg:col-span-2 bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-charcoal">Ostatnie ogłoszenia</h2>
            <Link to="/panel/ogloszenia" className="text-sm text-sage hover:text-sage-light flex items-center gap-1">
              Wszystkie <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
          {announcements.length === 0 ? (
            <p className="text-slate text-sm">Brak ogłoszeń.</p>
          ) : (
            <div className="space-y-4">
              {announcements.map((a) => (
                <div key={a.id} className="border-b border-cream-medium pb-4 last:border-0 last:pb-0">
                  <div className="flex items-start gap-2">
                    {a.is_pinned && (
                      <span className="mt-0.5 px-2 py-0.5 bg-amber-light text-amber text-xs font-medium rounded-full">
                        Ważne
                      </span>
                    )}
                    <div>
                      <h3 className="text-sm font-medium text-charcoal">{a.title}</h3>
                      {a.excerpt && <p className="text-sm text-slate mt-1">{a.excerpt}</p>}
                      <p className="text-xs text-outline mt-1">{formatDate(a.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Important dates */}
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-charcoal">Najbliższe terminy</h2>
            <Link to="/panel/terminy" className="text-sm text-sage hover:text-sage-light flex items-center gap-1">
              Więcej <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
          {dates.length === 0 ? (
            <p className="text-slate text-sm">Brak nadchodzących terminów.</p>
          ) : (
            <div className="space-y-3">
              {dates.map((d) => (
                <div key={d.id} className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-[var(--radius-input)] bg-sage-pale/30 flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-sage leading-none">
                      {new Date(d.date).getDate()}
                    </span>
                    <span className="text-[10px] text-sage uppercase">
                      {new Date(d.date).toLocaleDateString('pl-PL', { month: 'short' })}
                    </span>
                  </div>
                  <p className="text-sm text-charcoal pt-1">{d.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DashboardCard({
  icon,
  label,
  value,
  to,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  value: string
  to: string
  disabled?: boolean
}) {
  const content = (
    <div className={`bg-white rounded-[var(--radius-card)] shadow-ambient p-5 transition-shadow ${disabled ? 'opacity-60' : 'hover:shadow-hover'}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-[var(--radius-input)] bg-sage-pale/30 flex items-center justify-center text-sage">
          {icon}
        </div>
        <div>
          <p className="text-xs text-outline uppercase tracking-wide">{label}</p>
          <p className="text-sm font-semibold text-charcoal">{value}</p>
        </div>
      </div>
    </div>
  )

  if (disabled) return content
  return <Link to={to}>{content}</Link>
}
