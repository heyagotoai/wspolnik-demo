import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { PlusIcon, TrashIcon, XIcon } from '../../components/ui/Icons'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/ConfirmDialog'

interface Apartment {
  id: string
  number: string
  area_m2: number | null
  owner_name: string | null
}

interface Charge {
  id: string
  apartment_id: string
  month: string
  type: string
  amount: number
  description: string | null
  is_auto_generated: boolean
}

interface ChargeForm {
  apartment_id: string
  month: string
  type: string
  amount: string
  description: string
}

interface ChargeRate {
  id: string
  type: string
  rate_per_unit: string
  valid_from: string
  created_at: string
}

interface RateForm {
  type: string
  rate_per_unit: string
  valid_from: string
}

interface AutoChargesConfig {
  enabled: boolean
  day: number
}

interface GenerateSummary {
  month: string
  apartments_count: number
  charges_created: number
  total_amount: string
  warnings: string[]
}

const chargeTypes: Record<string, string> = {
  eksploatacja: 'Eksploatacja',
  fundusz_remontowy: 'Fundusz remontowy',
  smieci: 'Śmieci',
  inne: 'Inne',
}

const rateTypes: Record<string, string> = {
  eksploatacja: 'Eksploatacja',
  fundusz_remontowy: 'Fundusz remontowy',
  smieci: 'Śmieci',
}

const rateUnits: Record<string, string> = {
  eksploatacja: 'zł/m²',
  fundusz_remontowy: 'zł/m²',
  smieci: 'zł/os.',
}

const emptyChargeForm: ChargeForm = {
  apartment_id: '',
  month: new Date().toISOString().slice(0, 7) + '-01',
  type: 'inne',
  amount: '',
  description: '',
}

const emptyRateForm: RateForm = {
  type: 'eksploatacja',
  rate_per_unit: '',
  valid_from: new Date().toISOString().slice(0, 10),
}

type Tab = 'charges' | 'rates'

export default function AdminChargesPage() {
  const [tab, setTab] = useState<Tab>('charges')

  // --- Shared state ---
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { confirm } = useConfirm()

  // --- Charges state ---
  const [charges, setCharges] = useState<Charge[]>([])
  const [showChargeForm, setShowChargeForm] = useState(false)
  const [chargeForm, setChargeForm] = useState<ChargeForm>(emptyChargeForm)
  const [chargeSaving, setChargeSaving] = useState(false)
  const [chargeError, setChargeError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7))
  const [filterApartment, setFilterApartment] = useState<string>('all')

  // --- Generate state ---
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateMonth, setGenerateMonth] = useState(new Date().toISOString().slice(0, 7))
  const [generating, setGenerating] = useState(false)

  // --- Rates state ---
  const [rates, setRates] = useState<ChargeRate[]>([])
  const [showRateForm, setShowRateForm] = useState(false)
  const [rateForm, setRateForm] = useState<RateForm>(emptyRateForm)
  const [rateSaving, setRateSaving] = useState(false)
  const [rateError, setRateError] = useState<string | null>(null)
  const [deletingRate, setDeletingRate] = useState<string | null>(null)

  // --- Auto-config state ---
  const [autoConfig, setAutoConfig] = useState<AutoChargesConfig>({ enabled: false, day: 1 })
  const [autoSaving, setAutoSaving] = useState(false)

  // --- Data fetching ---

  const fetchChargesData = async () => {
    const [aptsRes, chargesRes] = await Promise.all([
      supabase
        .from('apartments')
        .select('id, number, area_m2, owner_resident_id')
        .order('number', { ascending: true }),
      supabase
        .from('charges')
        .select('id, apartment_id, month, type, amount, description, is_auto_generated')
        .order('month', { ascending: false }),
    ])

    if (aptsRes.data) {
      const mapped = aptsRes.data.map((a) => ({
        id: a.id,
        number: a.number,
        area_m2: a.area_m2,
        owner_name: null,
      }))
      mapped.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
      setApartments(mapped)
    }
    if (chargesRes.data) setCharges(chargesRes.data)
    setLoading(false)
  }

  const fetchRates = async () => {
    try {
      const data = await api.get<ChargeRate[]>('/charges/rates')
      setRates(data)
    } catch {
      toast('Nie udało się pobrać stawek.', 'error')
    }
  }

  const fetchAutoConfig = async () => {
    try {
      const data = await api.get<AutoChargesConfig>('/charges/auto-config')
      setAutoConfig(data)
    } catch {
      // ignore — non-critical
    }
  }

  useEffect(() => {
    fetchChargesData()
    fetchRates()
    fetchAutoConfig()
  }, [])

  // --- Charges handlers ---

  const openAddCharge = () => {
    setChargeForm({
      ...emptyChargeForm,
      apartment_id: apartments[0]?.id || '',
      month: filterMonth + '-01',
    })
    setChargeError(null)
    setShowChargeForm(true)
  }

  const closeChargeForm = () => {
    setShowChargeForm(false)
    setChargeForm(emptyChargeForm)
    setChargeError(null)
  }

  const handleSaveCharge = async () => {
    if (!chargeForm.apartment_id || !chargeForm.month || !chargeForm.amount) {
      setChargeError('Lokal, miesiąc i kwota są wymagane.')
      return
    }

    const amount = parseFloat(chargeForm.amount)
    if (isNaN(amount) || amount <= 0 || amount > 99999999.99) {
      setChargeError('Podaj prawidłową kwotę (0.01–99 999 999.99 PLN).')
      return
    }

    setChargeSaving(true)
    setChargeError(null)

    const { error: insertError } = await supabase.from('charges').insert({
      apartment_id: chargeForm.apartment_id,
      month: chargeForm.month,
      type: chargeForm.type,
      amount,
      description: chargeForm.description.trim() || null,
      is_auto_generated: false,
    })

    if (insertError) {
      setChargeError(insertError.message)
      setChargeSaving(false)
      return
    }

    toast('Naliczenie dodane.', 'success')
    await fetchChargesData()
    closeChargeForm()
    setChargeSaving(false)
  }

  const handleDeleteCharge = async (id: string) => {
    const ok = await confirm({
      title: 'Usuń naliczenie',
      message: 'Czy na pewno chcesz usunąć to naliczenie?',
      confirmLabel: 'Usuń',
      danger: true,
    })
    if (!ok) return

    setDeleting(id)
    await supabase.from('charges').delete().eq('id', id)
    await fetchChargesData()
    setDeleting(null)
  }

  // --- Generate handler ---

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const result = await api.post<GenerateSummary>('/charges/generate', {
        month: generateMonth + '-01',
      })
      toast(
        `Wygenerowano ${result.charges_created} naliczeń na łączną kwotę ${result.total_amount} zł.`,
        'success',
      )
      if (result.warnings.length > 0) {
        toast(`Uwagi: ${result.warnings.join('; ')}`, 'warning')
      }
      setShowGenerateModal(false)
      setFilterMonth(generateMonth)
      await fetchChargesData()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Błąd generowania naliczeń.', 'error')
    } finally {
      setGenerating(false)
    }
  }

  // --- Auto-config handler ---

  const handleAutoConfigChange = async (update: { enabled?: boolean; day?: number }) => {
    setAutoSaving(true)
    try {
      const result = await api.patch<AutoChargesConfig>('/charges/auto-config', update)
      setAutoConfig(result)
      toast(
        update.enabled !== undefined
          ? (update.enabled ? 'Auto-generowanie włączone.' : 'Auto-generowanie wyłączone.')
          : 'Dzień generowania zaktualizowany.',
        'success',
      )
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Błąd zapisu ustawień.', 'error')
    } finally {
      setAutoSaving(false)
    }
  }

  // --- Rates handlers ---

  const openAddRate = () => {
    setRateForm(emptyRateForm)
    setRateError(null)
    setShowRateForm(true)
  }

  const closeRateForm = () => {
    setShowRateForm(false)
    setRateForm(emptyRateForm)
    setRateError(null)
  }

  const handleSaveRate = async () => {
    if (!rateForm.rate_per_unit || !rateForm.valid_from) {
      setRateError('Stawka i data obowiązywania są wymagane.')
      return
    }

    const rate = parseFloat(rateForm.rate_per_unit)
    if (isNaN(rate) || rate <= 0) {
      setRateError('Podaj prawidłową stawkę (większą od 0).')
      return
    }

    setRateSaving(true)
    setRateError(null)

    try {
      await api.post('/charges/rates', {
        type: rateForm.type,
        rate_per_unit: rateForm.rate_per_unit,
        valid_from: rateForm.valid_from,
      })
      toast('Stawka dodana.', 'success')
      closeRateForm()
      await fetchRates()
    } catch (err) {
      setRateError(err instanceof Error ? err.message : 'Błąd zapisu stawki.')
    } finally {
      setRateSaving(false)
    }
  }

  const handleDeleteRate = async (rateId: string) => {
    const ok = await confirm({
      title: 'Usuń stawkę',
      message: 'Czy na pewno chcesz usunąć tę stawkę?',
      confirmLabel: 'Usuń',
      danger: true,
    })
    if (!ok) return

    setDeletingRate(rateId)
    try {
      await api.delete(`/charges/rates/${rateId}`)
      toast('Stawka usunięta.', 'success')
      await fetchRates()
    } catch {
      toast('Nie udało się usunąć stawki.', 'error')
    } finally {
      setDeletingRate(null)
    }
  }

  // --- Helpers ---

  const getApartmentNumber = (apartmentId: string) => {
    return apartments.find((a) => a.id === apartmentId)?.number || '—'
  }

  const filtered = charges.filter((c) => {
    const monthMatch = c.month.startsWith(filterMonth)
    const aptMatch = filterApartment === 'all' || c.apartment_id === filterApartment
    return monthMatch && aptMatch
  })

  const totalForFilter = filtered.reduce((sum, c) => sum + c.amount, 0)

  const formatMonth = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
  }

  /** For each rate type, find the most recent active rate */
  const getActiveRateId = (type: string): string | null => {
    const typeRates = rates.filter((r) => r.type === type)
    if (typeRates.length === 0) return null
    // rates are sorted by valid_from DESC from API
    return typeRates[0].id
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate">Ładowanie...</p>
      </div>
    )
  }

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      tab === t
        ? 'border-sage text-sage'
        : 'border-transparent text-slate hover:text-charcoal hover:border-cream-deep'
    }`

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-charcoal">Naliczenia</h1>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-cream-medium">
        <button className={tabClass('charges')} onClick={() => setTab('charges')}>
          Naliczenia
        </button>
        <button className={tabClass('rates')} onClick={() => setTab('rates')}>
          Stawki
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TAB: NALICZENIA
          ═══════════════════════════════════════════════════════════════ */}
      {tab === 'charges' && (
        <>
          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowGenerateModal(true)}
              disabled={apartments.length === 0 || rates.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50"
              title={rates.length === 0 ? 'Dodaj stawki w zakładce Stawki' : ''}
            >
              Generuj naliczenia
            </button>
            <button
              onClick={openAddCharge}
              disabled={apartments.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-sage text-sage text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage/5 transition-colors disabled:opacity-50"
            >
              <PlusIcon className="w-4 h-4" />
              Dodaj ręcznie
            </button>
          </div>

          {/* Auto-generation config */}
          <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoConfig.enabled}
                  onChange={(e) => handleAutoConfigChange({ enabled: e.target.checked })}
                  disabled={autoSaving || rates.length === 0}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-cream-deep rounded-full peer peer-checked:bg-sage transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
              </label>
              <span className="text-sm text-charcoal">
                Auto-generowanie naliczeń
              </span>
            </div>
            {autoConfig.enabled && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate">Dzień miesiąca:</span>
                <select
                  value={autoConfig.day}
                  onChange={(e) => handleAutoConfigChange({ day: parseInt(e.target.value) })}
                  disabled={autoSaving}
                  className="px-2 py-1 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}
            {rates.length === 0 && (
              <span className="text-xs text-outline">Dodaj stawki, aby włączyć</span>
            )}
          </div>

          {apartments.length === 0 && (
            <div className="bg-amber-light/30 rounded-[var(--radius-card)] p-4 text-sm text-amber">
              Brak lokali w systemie. Najpierw dodaj lokale, aby móc tworzyć naliczenia.
            </div>
          )}

          {/* Generate modal */}
          {showGenerateModal && (
            <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-charcoal">Generuj naliczenia</h2>
                <button onClick={() => setShowGenerateModal(false)} className="text-outline hover:text-charcoal">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate mb-4">
                System obliczy naliczenia dla wszystkich lokali na podstawie aktualnych stawek.
              </p>
              <div className="flex items-end gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Miesiąc</label>
                  <input
                    type="month"
                    value={generateMonth}
                    onChange={(e) => setGenerateMonth(e.target.value)}
                    className="px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
                  />
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50"
                >
                  {generating ? 'Generowanie...' : 'Generuj'}
                </button>
              </div>
            </div>
          )}

          {/* Manual charge form */}
          {showChargeForm && (
            <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-charcoal">Nowe naliczenie ręczne</h2>
                <button onClick={closeChargeForm} className="text-outline hover:text-charcoal">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              {chargeError && (
                <div className="mb-4 p-3 bg-error-container text-error text-sm rounded-[var(--radius-input)]">
                  {chargeError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Lokal *</label>
                  <select
                    value={chargeForm.apartment_id}
                    onChange={(e) => setChargeForm({ ...chargeForm, apartment_id: e.target.value })}
                    className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
                  >
                    {apartments.map((a) => (
                      <option key={a.id} value={a.id}>Lokal {a.number}{a.area_m2 ? ` (${a.area_m2} m²)` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Miesiąc *</label>
                  <input
                    type="month"
                    value={chargeForm.month.slice(0, 7)}
                    onChange={(e) => setChargeForm({ ...chargeForm, month: e.target.value + '-01' })}
                    className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Typ *</label>
                  <select
                    value={chargeForm.type}
                    onChange={(e) => setChargeForm({ ...chargeForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
                  >
                    {Object.entries(chargeTypes).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Kwota (PLN) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={chargeForm.amount}
                    onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-charcoal mb-1">Opis (opcjonalnie)</label>
                  <input
                    type="text"
                    value={chargeForm.description}
                    onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeChargeForm}
                  className="px-4 py-2 text-sm font-medium text-slate hover:text-charcoal transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSaveCharge}
                  disabled={chargeSaving}
                  className="px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50"
                >
                  {chargeSaving ? 'Zapisywanie...' : 'Zapisz'}
                </button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-outline uppercase tracking-wide mb-1">Miesiąc</label>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-outline uppercase tracking-wide mb-1">Lokal</label>
              <select
                value={filterApartment}
                onChange={(e) => setFilterApartment(e.target.value)}
                className="px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              >
                <option value="all">Wszystkie</option>
                {apartments.map((a) => (
                  <option key={a.id} value={a.id}>Lokal {a.number}</option>
                ))}
              </select>
            </div>
            {filtered.length > 0 && (
              <div className="ml-auto text-sm text-charcoal">
                Suma: <span className="font-bold">{totalForFilter.toFixed(2)} PLN</span>
              </div>
            )}
          </div>

          {/* Charges table */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
              <p className="text-slate">
                Brak naliczeń za {formatMonth(filterMonth + '-01')}
                {filterApartment !== 'all' ? ` dla lokalu ${getApartmentNumber(filterApartment)}` : ''}.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-[var(--radius-card)] shadow-ambient overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-cream-medium">
                      <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Lokal</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Typ</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Kwota</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Źródło</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Opis</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id} className="border-b border-cream last:border-0 hover:bg-cream/50 transition-colors">
                        <td className="px-5 py-3 font-medium text-charcoal">Lokal {getApartmentNumber(c.apartment_id)}</td>
                        <td className="px-5 py-3 text-slate">{chargeTypes[c.type] || c.type}</td>
                        <td className="px-5 py-3 text-right font-medium text-charcoal">{c.amount.toFixed(2)} zł</td>
                        <td className="px-5 py-3">
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                            c.is_auto_generated
                              ? 'bg-sage/10 text-sage'
                              : 'bg-amber-light/30 text-amber'
                          }`}>
                            {c.is_auto_generated ? 'Auto' : 'Ręczne'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate">{c.description || '—'}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleDeleteCharge(c.id)}
                            disabled={deleting === c.id}
                            className="p-1.5 text-outline hover:text-error transition-colors disabled:opacity-50"
                            title="Usuń"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB: STAWKI
          ═══════════════════════════════════════════════════════════════ */}
      {tab === 'rates' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate">
              Stawki określają kwoty używane do automatycznego generowania naliczeń.
            </p>
            <button
              onClick={openAddRate}
              className="flex items-center gap-2 px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Dodaj stawkę
            </button>
          </div>

          {/* Rate form */}
          {showRateForm && (
            <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-charcoal">Nowa stawka</h2>
                <button onClick={closeRateForm} className="text-outline hover:text-charcoal">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              {rateError && (
                <div className="mb-4 p-3 bg-error-container text-error text-sm rounded-[var(--radius-input)]">
                  {rateError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Typ *</label>
                  <select
                    value={rateForm.type}
                    onChange={(e) => setRateForm({ ...rateForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
                  >
                    {Object.entries(rateTypes).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">
                    Stawka ({rateUnits[rateForm.type]}) *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={rateForm.rate_per_unit}
                    onChange={(e) => setRateForm({ ...rateForm, rate_per_unit: e.target.value })}
                    placeholder="np. 4.50"
                    className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Obowiązuje od *</label>
                  <input
                    type="date"
                    value={rateForm.valid_from}
                    onChange={(e) => setRateForm({ ...rateForm, valid_from: e.target.value })}
                    className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeRateForm}
                  className="px-4 py-2 text-sm font-medium text-slate hover:text-charcoal transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSaveRate}
                  disabled={rateSaving}
                  className="px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50"
                >
                  {rateSaving ? 'Zapisywanie...' : 'Zapisz'}
                </button>
              </div>
            </div>
          )}

          {/* Rates table */}
          {rates.length === 0 ? (
            <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
              <p className="text-slate">Brak zdefiniowanych stawek.</p>
              <p className="text-sm text-outline mt-1">Dodaj stawki, aby móc generować naliczenia automatycznie.</p>
            </div>
          ) : (
            <div className="bg-white rounded-[var(--radius-card)] shadow-ambient overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-cream-medium">
                      <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Typ</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Stawka</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Obowiązuje od</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Status</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map((r) => {
                      const isActive = getActiveRateId(r.type) === r.id
                      return (
                        <tr key={r.id} className="border-b border-cream last:border-0 hover:bg-cream/50 transition-colors">
                          <td className="px-5 py-3 font-medium text-charcoal">{rateTypes[r.type] || r.type}</td>
                          <td className="px-5 py-3 text-right font-medium text-charcoal">
                            {parseFloat(r.rate_per_unit).toFixed(4)} {rateUnits[r.type] || 'zł'}
                          </td>
                          <td className="px-5 py-3 text-slate">{r.valid_from}</td>
                          <td className="px-5 py-3">
                            {isActive && (
                              <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-sage/10 text-sage">
                                Aktualna
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              onClick={() => handleDeleteRate(r.id)}
                              disabled={deletingRate === r.id}
                              className="p-1.5 text-outline hover:text-error transition-colors disabled:opacity-50"
                              title="Usuń"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
