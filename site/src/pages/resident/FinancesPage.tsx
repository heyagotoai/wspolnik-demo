import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { WalletIcon, CalendarIcon, ArrowRightIcon } from '../../components/ui/Icons'

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
}

const CHARGE_TYPE_LABELS: Record<string, string> = {
  eksploatacja: 'Eksploatacja',
  fundusz_remontowy: 'Fundusz remontowy',
  woda: 'Woda',
  smieci: 'Śmieci',
  ogrzewanie: 'Ogrzewanie',
  inne: 'Inne',
}

export default function FinancesPage() {
  const { user } = useAuth()
  const [apartment, setApartment] = useState<ApartmentInfo | null>(null)
  const [charges, setCharges] = useState<Charge[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    fetchData()
  }, [user])

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    // 1. Get resident's apartment
    const { data: apt, error: aptErr } = await supabase
      .from('apartments')
      .select('id, number')
      .eq('owner_resident_id', user!.id)
      .maybeSingle()

    if (aptErr) {
      setError('Nie udało się pobrać danych lokalu.')
      setLoading(false)
      return
    }

    if (!apt) {
      setApartment(null)
      setLoading(false)
      return
    }

    setApartment(apt)

    // 2. Fetch charges and payments for this apartment
    const [chargesRes, paymentsRes] = await Promise.all([
      supabase
        .from('charges')
        .select('id, month, type, amount, description')
        .eq('apartment_id', apt.id)
        .order('month', { ascending: false }),
      supabase
        .from('payments')
        .select('id, amount, payment_date, title, confirmed_by_admin')
        .eq('apartment_id', apt.id)
        .order('payment_date', { ascending: false }),
    ])

    if (chargesRes.data) setCharges(chargesRes.data)
    if (paymentsRes.data) setPayments(paymentsRes.data)
    setLoading(false)
  }

  // Calculations
  const totalCharges = charges.reduce((sum, c) => sum + Number(c.amount), 0)
  const totalPayments = payments
    .filter((p) => p.confirmed_by_admin)
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const balance = totalPayments - totalCharges

  // Current month charges
  const monthCharges = charges.filter((c) => c.month.startsWith(selectedMonth))
  const monthTotal = monthCharges.reduce((sum, c) => sum + Number(c.amount), 0)

  // Available months from charges
  const availableMonths = [...new Set(charges.map((c) => c.month.substring(0, 7)))].sort().reverse()

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

  if (!apartment) {
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
        <p className="text-slate mt-1">Lokal {apartment.number}</p>
      </div>

      {/* Balance card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BalanceCard
          label="Saldo"
          amount={balance}
          formatCurrency={formatCurrency}
          highlight
        />
        <BalanceCard
          label="Suma naliczeń"
          amount={-totalCharges}
          formatCurrency={formatCurrency}
        />
        <BalanceCard
          label="Suma wpłat"
          amount={totalPayments}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Monthly charges */}
      <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-charcoal">Naliczenia miesięczne</h2>
          {availableMonths.length > 0 && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-sm border border-cream-medium rounded-[var(--radius-input)] px-3 py-1.5 text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-sage/30"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                </option>
              ))}
            </select>
          )}
        </div>

        {monthCharges.length === 0 ? (
          <p className="text-slate text-sm py-4">Brak naliczeń za wybrany miesiąc.</p>
        ) : (
          <>
            <div className="space-y-3">
              {monthCharges.map((charge) => (
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
        <h2 className="text-lg font-semibold text-charcoal mb-4">Historia wpłat</h2>

        {payments.length === 0 ? (
          <p className="text-slate text-sm py-4">Brak zarejestrowanych wpłat.</p>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
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
