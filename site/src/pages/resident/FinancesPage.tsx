import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { WalletIcon } from '../../components/ui/Icons'

interface Charge {
  id: string
  month: string
  type: string
  amount: number
  description: string | null
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  title: string | null
  confirmed_by_admin: boolean
}

interface ApartmentInfo {
  id: string
  number: string
  initial_balance: number
  billing_group_id: string | null
}

interface ApartmentData {
  apartment: ApartmentInfo
  charges: Charge[]
  payments: Payment[]
  balance: number
  totalCharges: number
  totalPayments: number
}

const CHARGE_TYPE_LABELS: Record<string, string> = {
  eksploatacja: 'Eksploatacja',
  fundusz_remontowy: 'Fundusz remontowy',
  smieci: 'Śmieci',
  inne: 'Inne',
}

export default function FinancesPage() {
  const { user } = useAuth()
  const [apartmentsData, setApartmentsData] = useState<ApartmentData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Per-apartment month selectors
  const [selectedMonths, setSelectedMonths] = useState<Record<string, string>>({})

  // Active tab for multi-apartment view
  const [activeAptId, setActiveAptId] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    // Fetch all apartments visible to this user (RLS handles filtering)
    let apartments: ApartmentInfo[] = []

    // Primary: by owner_resident_id
    const { data: ownedApts, error: aptErr } = await supabase
      .from('apartments')
      .select('id, number, initial_balance, billing_group_id')
      .eq('owner_resident_id', user!.id)

    if (aptErr) {
      setError('Nie udało się pobrać danych lokalu.')
      setLoading(false)
      return
    }

    apartments = (ownedApts || []) as ApartmentInfo[]

    // If no apartments by owner_id, try fallback via apartment_number
    if (apartments.length === 0) {
      const { data: resident } = await supabase
        .from('residents')
        .select('apartment_number')
        .eq('id', user!.id)
        .maybeSingle()

      if (resident?.apartment_number) {
        const { data: aptByNumber } = await supabase
          .from('apartments')
          .select('id, number, initial_balance, billing_group_id')
          .eq('number', resident.apartment_number)
          .maybeSingle()
        if (aptByNumber) apartments = [aptByNumber as ApartmentInfo]
      }
    }

    // If owned apartments are in a billing group, also fetch other group members
    const groupIds = [...new Set(
      apartments.filter(a => a.billing_group_id).map(a => a.billing_group_id!)
    )]
    if (groupIds.length > 0) {
      const { data: groupApts } = await supabase
        .from('apartments')
        .select('id, number, initial_balance, billing_group_id')
        .in('billing_group_id', groupIds)

      if (groupApts) {
        const existingIds = new Set(apartments.map(a => a.id))
        for (const ga of groupApts) {
          if (!existingIds.has(ga.id)) {
            apartments.push(ga as ApartmentInfo)
          }
        }
      }
    }

    if (apartments.length === 0) {
      setApartmentsData([])
      setLoading(false)
      return
    }

    // Sort by apartment number
    apartments.sort((a, b) => a.number.localeCompare(b.number, 'pl', { numeric: true }))

    // Fetch charges and payments for all apartments
    const aptIds = apartments.map(a => a.id)
    const [chargesRes, paymentsRes] = await Promise.all([
      supabase
        .from('charges')
        .select('id, month, type, amount, description, apartment_id')
        .in('apartment_id', aptIds)
        .order('month', { ascending: false }),
      supabase
        .from('payments')
        .select('id, amount, payment_date, title, confirmed_by_admin, apartment_id')
        .in('apartment_id', aptIds)
        .order('payment_date', { ascending: false }),
    ])

    const allCharges = (chargesRes.data || []) as (Charge & { apartment_id: string })[]
    const allPayments = (paymentsRes.data || []) as (Payment & { apartment_id: string })[]

    // Build per-apartment data
    const data: ApartmentData[] = apartments.map(apt => {
      const aptCharges = allCharges.filter(c => c.apartment_id === apt.id)
      const aptPayments = allPayments.filter(p => p.apartment_id === apt.id)
      const initial = Number(apt.initial_balance) || 0
      const totalCharges = aptCharges.reduce((sum, c) => sum + Number(c.amount), 0)
      const totalPayments = aptPayments
        .filter(p => p.confirmed_by_admin)
        .reduce((sum, p) => sum + Number(p.amount), 0)
      const balance = initial + totalPayments - totalCharges

      return { apartment: apt, charges: aptCharges, payments: aptPayments, balance, totalCharges, totalPayments }
    })

    setApartmentsData(data)

    // Init month selectors and active tab
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const months: Record<string, string> = {}
    for (const d of data) {
      months[d.apartment.id] = currentMonth
    }
    setSelectedMonths(months)
    setActiveAptId(data[0]?.apartment.id || null)
    setLoading(false)
  }

  useEffect(() => {
    if (!user) return
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const hasGroup = apartmentsData.some(d => d.apartment.billing_group_id)
  const combinedBalance = apartmentsData.reduce((sum, d) => sum + d.balance, 0)
  const combinedCharges = apartmentsData.reduce((sum, d) => sum + d.totalCharges, 0)
  const combinedPayments = apartmentsData.reduce((sum, d) => sum + d.totalPayments, 0)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(amount)

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const date = new Date(Number(year), Number(month) - 1)
    return date.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate">Ładowanie...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-charcoal mb-6">Finanse</h1>
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
          <p className="text-error">{error}</p>
        </div>
      </div>
    )
  }

  if (apartmentsData.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-charcoal mb-6">Finanse</h1>
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-cream-medium flex items-center justify-center mx-auto mb-4">
            <WalletIcon className="w-8 h-8 text-outline" />
          </div>
          <h2 className="text-lg font-semibold text-charcoal mb-2">Brak przypisanego lokalu</h2>
          <p className="text-sm text-slate max-w-md mx-auto">
            Twoje konto nie jest jeszcze przypisane do żadnego lokalu. Skontaktuj się z administracją.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Finanse</h1>
        {apartmentsData.length === 1 ? (
          <p className="text-slate mt-1">Lokal {apartmentsData[0].apartment.number}</p>
        ) : (
          <p className="text-slate mt-1">
            {apartmentsData.length} {apartmentsData.length < 5 ? 'lokale' : 'lokali'}
            {hasGroup && ' (grupa rozliczeniowa)'}
          </p>
        )}
      </div>

      {/* Combined balance cards (when group or multiple apartments) */}
      {apartmentsData.length > 1 && hasGroup && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <BalanceCard label="Saldo łączne" amount={combinedBalance} formatCurrency={formatCurrency} highlight />
            <BalanceCard label="Suma naliczeń" amount={-combinedCharges} formatCurrency={formatCurrency} />
            <BalanceCard label="Suma wpłat" amount={combinedPayments} formatCurrency={formatCurrency} />
          </div>

          {/* Per-apartment balance breakdown */}
          <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-5">
            <h2 className="text-sm font-semibold text-charcoal mb-3">Rozbicie per lokal</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate border-b border-cream-medium">
                  <th className="pb-2">Lokal</th>
                  <th className="pb-2 text-right">Naliczenia</th>
                  <th className="pb-2 text-right">Wpłaty</th>
                  <th className="pb-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {apartmentsData.map(d => (
                  <tr key={d.apartment.id} className="border-t border-cream-medium/50">
                    <td className="py-2 font-medium text-charcoal">Lokal {d.apartment.number}</td>
                    <td className="py-2 text-right text-error">{formatCurrency(d.totalCharges)}</td>
                    <td className="py-2 text-right text-sage">{formatCurrency(d.totalPayments)}</td>
                    <td className={`py-2 text-right font-semibold ${d.balance >= 0 ? 'text-sage' : 'text-error'}`}>
                      {formatCurrency(Math.abs(d.balance))}
                      {d.balance < 0 && <span className="text-[10px] ml-0.5">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Apartment tabs (when multiple apartments) */}
      {apartmentsData.length > 1 && (
        <div className="flex gap-1 bg-cream-dark/50 p-1 rounded-[var(--radius-button)]">
          {apartmentsData.map(d => (
            <button
              key={d.apartment.id}
              onClick={() => setActiveAptId(d.apartment.id)}
              className={`flex-1 text-sm font-medium py-2 px-3 rounded-[var(--radius-button)] transition-colors ${
                activeAptId === d.apartment.id
                  ? 'bg-white text-charcoal shadow-sm'
                  : 'text-slate hover:text-charcoal'
              }`}
            >
              Lokal {d.apartment.number}
            </button>
          ))}
        </div>
      )}

      {/* Per-apartment details */}
      {apartmentsData
        .filter(d => apartmentsData.length === 1 || d.apartment.id === activeAptId)
        .map(d => (
          <ApartmentFinanceSection
            key={d.apartment.id}
            data={d}
            selectedMonth={selectedMonths[d.apartment.id] || ''}
            onMonthChange={(m) => setSelectedMonths(prev => ({ ...prev, [d.apartment.id]: m }))}
            showAptNumber={apartmentsData.length > 1}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            formatMonth={formatMonth}
          />
        ))}
    </div>
  )
}

function ApartmentFinanceSection({
  data,
  selectedMonth,
  onMonthChange,
  showAptNumber,
  formatCurrency,
  formatDate,
  formatMonth,
}: {
  data: ApartmentData
  selectedMonth: string
  onMonthChange: (m: string) => void
  showAptNumber: boolean
  formatCurrency: (n: number) => string
  formatDate: (s: string) => string
  formatMonth: (s: string) => string
}) {
  const { apartment, charges, payments, balance, totalCharges, totalPayments } = data

  const monthCharges = charges.filter(c => c.month.startsWith(selectedMonth))
  const monthTotal = monthCharges.reduce((sum, c) => sum + Number(c.amount), 0)
  const availableMonths = [...new Set(charges.map(c => c.month.substring(0, 7)))].sort().reverse()

  return (
    <div className="space-y-4">
      {/* Balance cards for single apartment (or always if no group) */}
      {!showAptNumber && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <BalanceCard label="Saldo" amount={balance} formatCurrency={formatCurrency} highlight />
          <BalanceCard label="Suma naliczeń" amount={-totalCharges} formatCurrency={formatCurrency} />
          <BalanceCard label="Suma wpłat" amount={totalPayments} formatCurrency={formatCurrency} />
        </div>
      )}

      {/* Monthly charges */}
      <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-charcoal">
            Naliczenia miesięczne
            {showAptNumber && <span className="text-slate font-normal text-sm ml-2">Lokal {apartment.number}</span>}
          </h2>
          {availableMonths.length > 0 && (
            <select
              value={selectedMonth}
              onChange={e => onMonthChange(e.target.value)}
              className="text-sm border border-cream-medium rounded-[var(--radius-input)] px-3 py-1.5 text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-sage/30"
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>{formatMonth(m)}</option>
              ))}
            </select>
          )}
        </div>

        {monthCharges.length === 0 ? (
          <p className="text-slate text-sm py-4">Brak naliczeń za wybrany miesiąc.</p>
        ) : (
          <>
            <div className="space-y-3">
              {monthCharges.map(charge => (
                <div
                  key={charge.id}
                  className="flex items-center justify-between py-2 border-b border-cream-medium last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-charcoal">
                      {CHARGE_TYPE_LABELS[charge.type] || charge.type}
                    </p>
                    {charge.description && (
                      <p className="text-xs text-slate mt-0.5">{charge.description}</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-charcoal">
                    {formatCurrency(Number(charge.amount))}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-4 mt-3 border-t border-charcoal/10">
              <p className="text-sm font-semibold text-charcoal">Razem</p>
              <p className="text-sm font-bold text-charcoal">{formatCurrency(monthTotal)}</p>
            </div>
          </>
        )}
      </div>

      {/* Payment history */}
      <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
        <h2 className="text-lg font-semibold text-charcoal mb-4">
          Historia wpłat
          {showAptNumber && <span className="text-slate font-normal text-sm ml-2">Lokal {apartment.number}</span>}
        </h2>

        {payments.length === 0 ? (
          <p className="text-slate text-sm py-4">Brak zarejestrowanych wpłat.</p>
        ) : (
          <div className="space-y-3">
            {payments.map(payment => (
              <div
                key={payment.id}
                className="flex items-center justify-between py-2 border-b border-cream-medium last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[var(--radius-input)] bg-sage-pale/30 flex items-center justify-center shrink-0">
                    <WalletIcon className="w-5 h-5 text-sage" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-charcoal">
                      {payment.title || 'Wpłata'}
                    </p>
                    <p className="text-xs text-slate">{formatDate(payment.payment_date)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-sage">
                    +{formatCurrency(Number(payment.amount))}
                  </p>
                  {!payment.confirmed_by_admin && (
                    <p className="text-[10px] text-amber font-medium">Oczekuje potwierdzenia</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BalanceCard({
  label,
  amount,
  formatCurrency,
  highlight,
}: {
  label: string
  amount: number
  formatCurrency: (n: number) => string
  highlight?: boolean
}) {
  const colorClass = highlight
    ? amount >= 0
      ? 'text-sage'
      : 'text-error'
    : 'text-charcoal'

  return (
    <div className={`bg-white rounded-[var(--radius-card)] shadow-ambient p-5 ${highlight ? 'ring-1 ring-sage/20' : ''}`}>
      <p className="text-xs text-outline uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-bold ${colorClass}`}>
        {formatCurrency(Math.abs(amount))}
        {highlight && amount < 0 && (
          <span className="text-xs font-normal text-error ml-1">niedopłata</span>
        )}
        {highlight && amount > 0 && (
          <span className="text-xs font-normal text-sage ml-1">nadpłata</span>
        )}
        {highlight && amount === 0 && (
          <span className="text-xs font-normal text-slate ml-1">rozliczone</span>
        )}
      </p>
    </div>
  )
}
