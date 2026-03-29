import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRole } from '../../hooks/useRole'
import { UsersIcon, MegaphoneIcon, FolderIcon, CalendarIcon, WalletIcon, ArrowRightIcon } from '../../components/ui/Icons'

interface Stats {
  residents: number
  apartments: number
  announcements: number
  documents: number
  upcomingDates: number
}

interface RecentAnnouncement {
  id: string
  title: string
  is_pinned: boolean
  created_at: string
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const { isAdmin } = useRole()
  const [stats, setStats] = useState<Stats>({ residents: 0, apartments: 0, announcements: 0, documents: 0, upcomingDates: 0 })
  const [recentAnnouncements, setRecentAnnouncements] = useState<RecentAnnouncement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [residentsRes, apartmentsRes, announcementsRes, docsRes, datesRes, recentAnnRes] = await Promise.all([
        supabase.from('residents').select('id', { count: 'exact', head: true }),
        supabase.from('apartments').select('id', { count: 'exact', head: true }),
        supabase.from('announcements').select('id', { count: 'exact', head: true }),
        supabase.from('documents').select('id', { count: 'exact', head: true }),
        supabase.from('important_dates').select('id', { count: 'exact', head: true })
          .gte('date', new Date().toISOString().split('T')[0]),
        supabase.from('announcements')
          .select('id, title, is_pinned, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      setStats({
        residents: residentsRes.count ?? 0,
        apartments: apartmentsRes.count ?? 0,
        announcements: announcementsRes.count ?? 0,
        documents: docsRes.count ?? 0,
        upcomingDates: datesRes.count ?? 0,
      })

      if (recentAnnRes.data) setRecentAnnouncements(recentAnnRes.data)
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
        <h1 className="text-2xl font-bold text-charcoal">
          {isAdmin ? 'Panel administratora' : 'Panel zarządcy'}
        </h1>
        <p className="text-slate mt-1">
          Witaj, {user?.email?.split('@')[0]} — zarządzaj wspólnotą z jednego miejsca.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {isAdmin && (
          <StatCard icon={<UsersIcon className="w-6 h-6" />} label="Mieszkańcy" value={String(stats.residents)} to="/admin/mieszkancy" />
        )}
        <StatCard icon={<MegaphoneIcon className="w-6 h-6" />} label="Ogłoszenia" value={String(stats.announcements)} to="/admin/ogloszenia" />
        <StatCard icon={<FolderIcon className="w-6 h-6" />} label="Dokumenty" value={String(stats.documents)} to="/admin/dokumenty" />
        <StatCard icon={<CalendarIcon className="w-6 h-6" />} label="Nadchodzące terminy" value={String(stats.upcomingDates)} to="/admin/terminy" />
        <StatCard icon={<WalletIcon className="w-6 h-6" />} label="Lokale" value={String(stats.apartments)} to="/admin/naliczenia" />
      </div>

      {/* Recent announcements */}
      <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-charcoal">Ostatnie ogłoszenia</h2>
          <Link to="/admin/ogloszenia" className="text-sm text-sage hover:text-sage-light flex items-center gap-1">
            Zarządzaj <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
        {recentAnnouncements.length === 0 ? (
          <p className="text-slate text-sm">Brak ogłoszeń. Dodaj pierwsze ogłoszenie.</p>
        ) : (
          <div className="space-y-3">
            {recentAnnouncements.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-cream-medium last:border-0">
                <div className="flex items-center gap-2">
                  {a.is_pinned && (
                    <span className="px-2 py-0.5 bg-amber-light text-amber text-xs font-medium rounded-full">
                      Ważne
                    </span>
                  )}
                  <span className="text-sm text-charcoal">{a.title}</span>
                </div>
                <span className="text-xs text-outline">{formatDate(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, to }: { icon: React.ReactNode; label: string; value: string; to: string }) {
  return (
    <Link to={to}>
      <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-5 hover:shadow-hover transition-shadow">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-input)] bg-sage-pale/30 flex items-center justify-center text-sage">
            {icon}
          </div>
          <div>
            <p className="text-xs text-outline uppercase tracking-wide">{label}</p>
            <p className="text-lg font-bold text-charcoal">{value}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
