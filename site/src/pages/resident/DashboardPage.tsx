import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { getReadIds } from '../../lib/readAnnouncements'
import { roundMoney2 } from '../../lib/money'
import { MegaphoneIcon, CalendarIcon, FolderIcon, WalletIcon, ArrowRightIcon, VoteIcon } from '../../components/ui/Icons'

interface Announcement {
  id: string
  title: string
  excerpt: string | null
  is_pinned: boolean
  created_at: string
}

interface Resolution {
  id: string
  title: string
  voting_end: string | null
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set())
  const unreadCount = unreadIds.size
  const [nextDate, setNextDate] = useState<string | null>(null)
  const [resolutions, setResolutions] = useState<Resolution[]>([])
  const [votedResolutionTitles, setVotedResolutionTitles] = useState<Set<string>>(new Set())
  const [balance, setBalance] = useState<number | null>(null)
  const [apartmentCount, setApartmentCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [annRes, datesRes, resRes] = await Promise.all([
        supabase
          .from('announcements')
          .select('id, title, excerpt, is_pinned, created_at')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('important_dates')
          .select('date')
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true })
          .limit(1),
        supabase
          .from('resolutions')
          .select('id, title, voting_end')
          .eq('status', 'voting')
          .order('created_at', { ascending: false })
          .limit(3),
      ])

      if (annRes.data) {
        setAnnouncements(annRes.data)
        if (user) {
          const readIds = getReadIds(user.id)
          setUnreadIds(new Set(annRes.data.filter((a: Announcement) => !readIds.has(a.id)).map((a: Announcement) => a.id)))
        }
      }
      if (resRes.data) setResolutions(resRes.data)

      // Check which active resolutions the user already voted on
      const votedIds = new Set<string>()
      if (resRes.data?.length && user) {
        const { data: votes } = await supabase
          .from('votes')
          .select('resolution_id')
          .eq('resident_id', user.id)
          .in('resolution_id', resRes.data.map((r: Resolution) => r.id))
        if (votes) {
          for (const v of votes) votedIds.add(v.resolution_id)
          const titles = new Set(
            resRes.data
              .filter((r: Resolution) => votedIds.has(r.id))
              .map((r: Resolution) => r.title)
          )
          setVotedResolutionTitles(titles)
        }
      }

      // Nearest upcoming date: important_dates + voting deadlines user hasn't voted on yet
      const allDates: string[] = []
      if (datesRes.data?.[0]) allDates.push(datesRes.data[0].date)
      for (const r of resRes.data || []) {
        if (r.voting_end && !votedIds.has(r.id)) allDates.push(r.voting_end)
      }
      allDates.sort()
      if (allDates.length > 0) setNextDate(allDates[0])

      // Fetch balance: payments - charges for user's apartments (including billing groups)
      if (user) {
        let apartments: { id: string; initial_balance: number; billing_group_id: string | null }[] = []

        const { data: ownedApts } = await supabase
          .from('apartments')
          .select('id, initial_balance, billing_group_id')
          .eq('owner_resident_id', user.id)

        apartments = ownedApts || []

        // Fallback via apartment_number if no owned apartments
        if (apartments.length === 0) {
          const { data: resident } = await supabase
            .from('residents')
            .select('apartment_number')
            .eq('id', user.id)
            .maybeSingle()

          if (resident?.apartment_number) {
            const { data: aptByNumber } = await supabase
              .from('apartments')
              .select('id, initial_balance, billing_group_id')
              .eq('number', resident.apartment_number)
              .maybeSingle()
            if (aptByNumber) apartments = [aptByNumber]
          }
        }

        // Include billing group members
        const groupIds = [...new Set(
          apartments.filter(a => a.billing_group_id).map(a => a.billing_group_id!)
        )]
        if (groupIds.length > 0) {
          const { data: groupApts } = await supabase
            .from('apartments')
            .select('id, initial_balance, billing_group_id')
            .in('billing_group_id', groupIds)
          if (groupApts) {
            const existingIds = new Set(apartments.map(a => a.id))
            for (const ga of groupApts) {
              if (!existingIds.has(ga.id)) apartments.push(ga)
            }
          }
        }

        setApartmentCount(apartments.length)

        if (apartments.length > 0) {
          const aptIds = apartments.map(a => a.id)
          const [chargesRes2, paymentsRes2] = await Promise.all([
            supabase.from('charges').select('amount').in('apartment_id', aptIds),
            supabase.from('payments').select('amount, confirmed_by_admin').in('apartment_id', aptIds),
          ])

          const totalCharges = (chargesRes2.data || []).reduce((s, c) => s + Number(c.amount), 0)
          const totalPayments = (paymentsRes2.data || [])
            .filter((p: { confirmed_by_admin: boolean }) => p.confirmed_by_admin)
            .reduce((s, p) => s + Number(p.amount), 0)
          const initialBalanceSum = apartments.reduce((s, a) => s + (Number(a.initial_balance) || 0), 0)
          setBalance(roundMoney2(initialBalanceSum + totalPayments - totalCharges))
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [user])

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <DashboardCard
          icon={<MegaphoneIcon className="w-6 h-6" />}
          label="Ogłoszenia"
          value={unreadCount > 0 ? `${unreadCount} ${unreadCount === 1 ? 'nowe' : 'nowych'}` : 'Brak nowych'}
          to="/panel/ogloszenia"
        />
        <DashboardCard
          icon={<CalendarIcon className="w-6 h-6" />}
          label="Terminy"
          value={nextDate ? formatDate(nextDate) : 'Brak'}
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
          label={apartmentCount > 1 ? `Finanse (${apartmentCount} lokale)` : 'Finanse'}
          value={balance !== null
            ? new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(balance)
            : 'Brak lokalu'}
          to="/panel/finanse"
        />
        <DashboardCard
          icon={<VoteIcon className="w-6 h-6" />}
          label="Głosowania"
          value={`${resolutions.length} aktywnych`}
          to="/panel/glosowania"
        />
      </div>

      {/* Announcements */}
      <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
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
                    {a.title.startsWith('Nowe głosowanie:') ? (
                      <>
                        <Link to="/panel/glosowania" className="text-sm font-medium text-sage hover:text-sage-light">{a.title}</Link>
                        {votedResolutionTitles.has(a.title.replace('Nowe głosowanie: ', '')) ? (
                          <p className="text-xs text-sage mt-1">Oddałeś już głos w tej uchwale.</p>
                        ) : (
                          <p className="text-xs text-error mt-1">Czeka na Twój głos</p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-charcoal">{a.title}</h3>
                          {unreadIds.has(a.id) && (
                            <span className="px-1.5 py-0.5 bg-sage text-white text-xs font-medium rounded-full">Nowe</span>
                          )}
                        </div>
                        {a.excerpt && <p className="text-sm text-slate mt-1">{a.excerpt}</p>}
                      </>
                    )}
                    <p className="text-xs text-outline mt-1">{formatDate(a.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
