import { Fragment, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { PlusIcon, TrashIcon, XIcon, ChevronDownIcon, DownloadIcon, SendIcon, EditIcon } from '../../components/ui/Icons'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { useRole } from '../../hooks/useRole'
import { BillingGroupsPanel } from './BillingGroupsPage'
import { DemoHelpCallout } from '../../demo/DemoHelpCallout'
import { formatCaughtError, mapSupabaseError } from '../../lib/userFacingErrors'

interface Apartment {
  id: string
  number: string
  area_m2: number | null
  declared_occupants: number
  owner_resident_id: string | null
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
  regenerated: boolean
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

interface BulkResults {
  sent: string[]
  failed: { number: string; error: string }[]
}

interface ZawiadomienieConfig {
  legal_basis: string
}

type Tab = 'charges' | 'billing' | 'rates' | 'zawiadomienia'

export default function AdminChargesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('charges')

  // --- Shared state ---
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const { isAdmin } = useRole()

  // --- Charges state ---
  const [charges, setCharges] = useState<Charge[]>([])
  const [showChargeForm, setShowChargeForm] = useState(false)
  const [chargeForm, setChargeForm] = useState<ChargeForm>(emptyChargeForm)
  const [chargeSaving, setChargeSaving] = useState(false)
  const [chargeError, setChargeError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7))
  const [filterApartment, setFilterApartment] = useState<string>('all')
  const [expandedApts, setExpandedApts] = useState<Set<string>>(new Set())

  // --- Generate state ---
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateMonth, setGenerateMonth] = useState(new Date().toISOString().slice(0, 7))
  const [generating, setGenerating] = useState(false)

  // --- Rates state ---
  const [rates, setRates] = useState<ChargeRate[]>([])
  const [ratesLoadError, setRatesLoadError] = useState(false)
  const [showRateForm, setShowRateForm] = useState(false)
  const [rateForm, setRateForm] = useState<RateForm>(emptyRateForm)
  const [rateSaving, setRateSaving] = useState(false)
  const [rateError, setRateError] = useState<string | null>(null)
  const [deletingRate, setDeletingRate] = useState<string | null>(null)

  // --- Auto-config state ---
  const [autoConfig, setAutoConfig] = useState<AutoChargesConfig>({ enabled: false, day: 1 })
  const [autoSaving, setAutoSaving] = useState(false)

  // --- Zawiadomienia state ---
  const [legalBasis, setLegalBasis] = useState('')
  const [legalBasisDraft, setLegalBasisDraft] = useState('')
  const [editingLegalBasis, setEditingLegalBasis] = useState(false)
  const [savingLegalBasis, setSavingLegalBasis] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null)
  const [sendingNotification, setSendingNotification] = useState<string | null>(null)
  const [zawBulkMode, setZawBulkMode] = useState(false)
  const [zawSelectedIds, setZawSelectedIds] = useState<Set<string>>(new Set())
  const [zawBulkSending, setZawBulkSending] = useState(false)
  const [zawBulkResults, setZawBulkResults] = useState<BulkResults | null>(null)
  // MM.YYYY format — admin decides when rates take effect
  const [zawValidFrom, setZawValidFrom] = useState(() => {
    const now = new Date()
    return `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`
  })

  // --- Data fetching ---

  const fetchChargesData = async () => {
    const [aptsRes, chargesRes] = await Promise.all([
      supabase
        .from('apartments')
        .select('id, number, area_m2, declared_occupants, owner_resident_id')
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
        declared_occupants: a.declared_occupants ?? 0,
        owner_resident_id: a.owner_resident_id ?? null,
        owner_name: null,
      }))
      mapped.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
      setApartments(mapped)
    }
    if (chargesRes.data) setCharges(chargesRes.data)
    setLoading(false)
  }

  const fetchRates = async () => {
    setRatesLoadError(false)
    try {
      const data = await api.get<ChargeRate[]>('/charges/rates')
      setRates(data)
    } catch {
      setRatesLoadError(true)
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

  const fetchZawiadomienieConfig = async () => {
    try {
      const data = await api.get<ZawiadomienieConfig>('/charges/zawiadomienie-config')
      setLegalBasis(data.legal_basis)
    } catch {
      // ignore — non-critical
    }
  }

  useEffect(() => {
    Promise.all([fetchChargesData(), fetchRates(), fetchAutoConfig(), fetchZawiadomienieConfig()])
  }, [])

  useEffect(() => {
    if (searchParams.get('tab') !== 'grupy') return
    if (isAdmin) {
      setTab('billing')
    }
    setSearchParams({}, { replace: true })
  }, [searchParams, isAdmin, setSearchParams])

  useEffect(() => {
    if (!isAdmin && tab === 'billing') {
      setTab('charges')
    }
  }, [isAdmin, tab])

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
      setChargeError(mapSupabaseError(insertError))
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
    const monthValue = generateMonth + '-01'

    // Check if auto-generated charges already exist for this month
    const existingAuto = charges.some(
      (c) => c.month === monthValue && c.is_auto_generated,
    )

    let force = false
    if (existingAuto) {
      const ok = await confirm({
        title: 'Aktualizacja naliczeń',
        message: `Naliczenia za ${generateMonth} zostały już wygenerowane. Czy chcesz je przeliczyć? Istniejące naliczenia automatyczne zostaną zastąpione nowymi.`,
        confirmLabel: 'Aktualizuj',
      })
      if (!ok) return
      force = true
    }

    setGenerating(true)
    try {
      const result = await api.post<GenerateSummary>('/charges/generate', {
        month: monthValue,
        force,
      })
      const action = result.regenerated ? 'Zaktualizowano' : 'Wygenerowano'
      toast(
        `${action} ${result.charges_created} naliczeń na łączną kwotę ${result.total_amount} zł.`,
        'success',
      )
      if (result.warnings.length > 0) {
        toast(`Uwagi: ${result.warnings.join('; ')}`, 'info')
      }
      setShowGenerateModal(false)
      setFilterMonth(generateMonth)
      await fetchChargesData()
    } catch (err) {
      toast(formatCaughtError(err, 'Błąd generowania naliczeń.'), 'error')
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
      toast(formatCaughtError(err, 'Błąd zapisu ustawień.'), 'error')
    } finally {
      setAutoSaving(false)
    }
  }

  // --- Zawiadomienia handlers ---

  const handleSaveLegalBasis = async () => {
    setSavingLegalBasis(true)
    try {
      const result = await api.patch<ZawiadomienieConfig>('/charges/zawiadomienie-config', {
        legal_basis: legalBasisDraft,
      })
      setLegalBasis(result.legal_basis)
      setEditingLegalBasis(false)
      toast('Podstawa prawna zaktualizowana.', 'success')
    } catch (err) {
      toast(formatCaughtError(err, 'Błąd zapisu.'), 'error')
    } finally {
      setSavingLegalBasis(false)
    }
  }

  const handleDownloadPdf = async (aptId: string) => {
    setDownloadingPdf(aptId)
    try {
      const blob = await api.getBlob(`/charges/charge-notification-preview/${aptId}?valid_from=${zawValidFrom}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const apt = apartments.find((x) => x.id === aptId)
      a.download = `zawiadomienie_lokal_${apt?.number || aptId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      toast(formatCaughtError(err, 'Błąd pobierania PDF.'), 'error')
    } finally {
      setDownloadingPdf(null)
    }
  }

  const handleSendNotification = async (aptId: string) => {
    const apt = apartments.find((x) => x.id === aptId)
    const ok = await confirm({
      title: 'Wyślij zawiadomienie',
      message: `Wysłać zawiadomienie o opłatach na email właściciela lokalu ${apt?.number || aptId}?`,
      confirmLabel: 'Wyślij',
    })
    if (!ok) return

    setSendingNotification(aptId)
    try {
      const result = await api.post<{ detail: string }>(`/charges/charge-notification/${aptId}?valid_from=${zawValidFrom}`, {})
      toast(result.detail, 'success')
    } catch (err) {
      toast(formatCaughtError(err, 'Błąd wysyłki.'), 'error')
    } finally {
      setSendingNotification(null)
    }
  }

  const handleZawBulkSend = async () => {
    const ids = [...zawSelectedIds]
    if (ids.length === 0) return

    const ok = await confirm({
      title: 'Wyślij zawiadomienia',
      message: `Wyślesz zawiadomienia o opłatach do ${ids.length} lokali.`,
      confirmLabel: 'Wyślij',
    })
    if (!ok) return

    setZawBulkSending(true)
    setZawBulkResults(null)
    try {
      const result = await api.post<BulkResults>('/charges/charge-notification-bulk', {
        apartment_ids: ids,
        valid_from: zawValidFrom,
      })
      setZawBulkResults(result)
      if (result.sent.length > 0 && result.failed.length === 0) {
        toast(`Wysłano zawiadomienia do ${result.sent.length} lokali.`, 'success')
      }
    } catch (err) {
      toast(formatCaughtError(err, 'Błąd wysyłki.'), 'error')
    } finally {
      setZawBulkSending(false)
    }
  }

  /** Calculate monthly charge for an apartment based on active rates for zawValidFrom */
  const calcMonthlyCharge = (apt: Apartment): number => {
    if (rates.length === 0) return 0
    // Convert MM.YYYY to YYYY-MM-01 for comparison with valid_from
    const [mm, yyyy] = zawValidFrom.split('.')
    const cutoff = `${yyyy}-${mm}-01`

    let total = 0
    // For each rate type, find the most recent rate where valid_from <= cutoff
    for (const rtype of ['eksploatacja', 'fundusz_remontowy', 'smieci'] as const) {
      const typeRates = rates
        .filter((r) => r.type === rtype && r.valid_from <= cutoff)
        .sort((a, b) => b.valid_from.localeCompare(a.valid_from))
      if (typeRates.length === 0) continue
      const rateVal = parseFloat(typeRates[0].rate_per_unit)
      if (rtype === 'eksploatacja' || rtype === 'fundusz_remontowy') {
        if (apt.area_m2 && apt.area_m2 > 0) total += apt.area_m2 * rateVal
      } else if (rtype === 'smieci') {
        if (apt.declared_occupants > 0) total += apt.declared_occupants * rateVal
      }
    }
    return Math.round(total * 100) / 100
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
      setRateError(formatCaughtError(err, 'Błąd zapisu stawki.'))
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
  const totalByType = filtered.reduce<Record<string, number>>((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + c.amount
    return acc
  }, {})

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

  /** Group filtered charges by apartment */
  const groupedByApartment = (() => {
    const groups: Record<string, { aptId: string; aptNumber: string; charges: Charge[]; total: number }> = {}
    for (const c of filtered) {
      if (!groups[c.apartment_id]) {
        groups[c.apartment_id] = {
          aptId: c.apartment_id,
          aptNumber: getApartmentNumber(c.apartment_id),
          charges: [],
          total: 0,
        }
      }
      groups[c.apartment_id].charges.push(c)
      groups[c.apartment_id].total += Number(c.amount)
    }
    return Object.values(groups).sort((a, b) =>
      a.aptNumber.localeCompare(b.aptNumber, undefined, { numeric: true })
    )
  })()

  const toggleApt = (aptId: string) => {
    setExpandedApts((prev) => {
      const next = new Set(prev)
      if (next.has(aptId)) next.delete(aptId)
      else next.add(aptId)
      return next
    })
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

      <DemoHelpCallout>
        Od zakładki: miesięczne opłaty na lokale, stawki (np. za m²), zawiadomienia o należnościach oraz — dla administratora
        — grupy rozliczeniowe (np. wspólny licznik). Generowanie i wysyłki w produkcji tworzą prawdziwe dokumenty i maile;
        tutaj wszystko jest symulowane.
      </DemoHelpCallout>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-cream-medium">
        <button className={tabClass('charges')} onClick={() => setTab('charges')}>
          Naliczenia
        </button>
        {isAdmin && (
          <button className={tabClass('billing')} onClick={() => setTab('billing')}>
            Grupy rozliczeniowe
          </button>
        )}
        <button className={tabClass('rates')} onClick={() => setTab('rates')}>
          Stawki
        </button>
        <button className={tabClass('zawiadomienia')} onClick={() => setTab('zawiadomienia')}>
          Zawiadomienia
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TAB: NALICZENIA
          ═══════════════════════════════════════════════════════════════ */}
      {tab === 'charges' && (
        <>
          {/* Action buttons — admin only */}
          {isAdmin && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowGenerateModal(true)}
                disabled={apartments.length === 0 || rates.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50"
                title={ratesLoadError ? 'Nie udało się pobrać stawek — odśwież stronę' : rates.length === 0 ? 'Dodaj stawki w zakładce Stawki' : ''}
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
          )}

          {/* Auto-generation config — admin only */}
          {isAdmin && <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-4 flex flex-wrap items-center gap-4">
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
          </div>}

          {apartments.length === 0 && (
            <div className="bg-amber-light/30 rounded-[var(--radius-card)] p-4 text-sm text-amber">
              Brak lokali w systemie. Najpierw dodaj lokale, aby móc tworzyć naliczenia.
            </div>
          )}

          {/* Generate modal — admin only */}
          {isAdmin && showGenerateModal && (
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
              <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate">
                {Object.entries(chargeTypes).map(([type, label]) =>
                  totalByType[type] ? (
                    <span key={type}>{label}: <span className="font-medium text-charcoal">{totalByType[type].toFixed(2)}</span></span>
                  ) : null
                )}
                <span className="text-charcoal font-bold">Suma: {totalForFilter.toFixed(2)} PLN</span>
              </div>
            )}
          </div>

          {/* Charges table — grouped by apartment */}
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
                      <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide w-8"></th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Lokal</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Składniki</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Kwota</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Źródło</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedByApartment.map((group) => {
                      const isExpanded = expandedApts.has(group.aptId)
                      const hasAuto = group.charges.some((c) => c.is_auto_generated)
                      const hasManual = group.charges.some((c) => !c.is_auto_generated)
                      return (
                        <Fragment key={group.aptId}>
                          {/* Summary row */}
                          <tr
                            className="border-b border-cream hover:bg-cream/50 transition-colors cursor-pointer"
                            onClick={() => toggleApt(group.aptId)}
                          >
                            <td className="pl-5 py-3">
                              <ChevronDownIcon
                                className={`w-4 h-4 text-outline transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                              />
                            </td>
                            <td className="px-5 py-3 font-medium text-charcoal">Lokal {group.aptNumber}</td>
                            <td className="px-5 py-3 text-slate text-xs">
                              {group.charges.map((c) => chargeTypes[c.type] || c.type).join(', ')}
                            </td>
                            <td className="px-5 py-3 text-right font-bold text-charcoal">{group.total.toFixed(2)} zł</td>
                            <td className="px-5 py-3">
                              <div className="flex gap-1">
                                {hasAuto && (
                                  <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-sage/10 text-sage">Auto</span>
                                )}
                                {hasManual && (
                                  <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-amber-light/30 text-amber">Ręczne</span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right text-xs text-outline">
                              {group.charges.length} {group.charges.length === 1 ? 'pozycja' : group.charges.length < 5 ? 'pozycje' : 'pozycji'}
                            </td>
                          </tr>
                          {/* Detail rows */}
                          {isExpanded && group.charges.map((c) => (
                            <tr key={c.id} className="border-b border-cream/50 last:border-cream bg-cream/20">
                              <td className="pl-5 py-2"></td>
                              <td className="px-5 py-2"></td>
                              <td className="px-5 py-2 text-slate">{chargeTypes[c.type] || c.type}{c.description ? ` — ${c.description}` : ''}</td>
                              <td className="px-5 py-2 text-right font-medium text-charcoal">{Number(c.amount).toFixed(2)} zł</td>
                              <td className="px-5 py-2">
                                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                                  c.is_auto_generated ? 'bg-sage/10 text-sage' : 'bg-amber-light/30 text-amber'
                                }`}>
                                  {c.is_auto_generated ? 'Auto' : 'Ręczne'}
                                </span>
                              </td>
                              <td className="px-5 py-2 text-right">
                                {isAdmin && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteCharge(c.id) }}
                                    disabled={deleting === c.id}
                                    className="p-1.5 text-outline hover:text-error transition-colors disabled:opacity-50"
                                    title="Usuń"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB: GRUPY ROZLICZENIOWE (tylko admin) */}
      {tab === 'billing' && isAdmin && <BillingGroupsPanel />}

      {/* ═══════════════════════════════════════════════════════════════
          TAB: STAWKI
          ═══════════════════════════════════════════════════════════════ */}
      {tab === 'rates' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate">
              Stawki określają kwoty używane do automatycznego generowania naliczeń.
            </p>
            {isAdmin && (
              <button
                onClick={openAddRate}
                className="flex items-center gap-2 px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Dodaj stawkę
              </button>
            )}
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
              {ratesLoadError ? (
                <>
                  <p className="text-slate">Nie udało się pobrać stawek.</p>
                  <button onClick={fetchRates} className="mt-2 text-sm text-sage hover:underline">Spróbuj ponownie</button>
                </>
              ) : (
                <>
                  <p className="text-slate">Brak zdefiniowanych stawek.</p>
                  <p className="text-sm text-outline mt-1">Dodaj stawki, aby móc generować naliczenia automatycznie.</p>
                </>
              )}
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
                            {parseFloat(r.rate_per_unit).toFixed(2)} {rateUnits[r.type] || 'zł'}
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
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteRate(r.id)}
                                disabled={deletingRate === r.id}
                                className="p-1.5 text-outline hover:text-error transition-colors disabled:opacity-50"
                                title="Usuń"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}
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

      {/* ═══════════════════════════════════════════════════════════════
          TAB: ZAWIADOMIENIA
          ═══════════════════════════════════════════════════════════════ */}
      {tab === 'zawiadomienia' && (
        <>
          {/* Podstawa prawna */}
          <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-charcoal">Podstawa prawna</h2>
              {!editingLegalBasis && (
                <button
                  onClick={() => { setLegalBasisDraft(legalBasis); setEditingLegalBasis(true) }}
                  className="flex items-center gap-1.5 text-sm text-sage hover:text-sage-light transition-colors"
                >
                  <EditIcon className="w-4 h-4" />
                  Edytuj
                </button>
              )}
            </div>
            {editingLegalBasis ? (
              <div className="space-y-3">
                <textarea
                  value={legalBasisDraft}
                  onChange={(e) => setLegalBasisDraft(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage resize-y"
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setEditingLegalBasis(false)}
                    className="px-4 py-2 text-sm font-medium text-slate hover:text-charcoal transition-colors"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleSaveLegalBasis}
                    disabled={savingLegalBasis}
                    className="px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50"
                  >
                    {savingLegalBasis ? 'Zapisywanie...' : 'Zapisz'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate leading-relaxed">{legalBasis || '—'}</p>
            )}
          </div>

          {/* Aktywne stawki — podsumowanie */}
          {rates.length > 0 && (
            <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-4">
              <p className="text-sm text-slate">
                <span className="font-medium text-charcoal">Aktywne stawki: </span>
                {Object.keys(rateTypes).map((type) => {
                  const activeId = getActiveRateId(type)
                  const rate = rates.find((r) => r.id === activeId)
                  if (!rate) return null
                  return (
                    <Fragment key={type}>
                      {rateTypes[type]} {parseFloat(rate.rate_per_unit).toFixed(2)} {rateUnits[type]}
                      {type !== 'smieci' ? ', ' : ''}
                    </Fragment>
                  )
                })}
              </p>
            </div>
          )}

          {/* Od miesiąca + toolbar */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-charcoal whitespace-nowrap">Od miesiąca:</label>
              <input
                type="month"
                value={(() => {
                  const [mm, yyyy] = zawValidFrom.split('.')
                  return `${yyyy}-${mm}`
                })()}
                onChange={(e) => {
                  const [yyyy, mm] = e.target.value.split('-')
                  if (yyyy && mm) setZawValidFrom(`${mm}.${yyyy}`)
                }}
                className="px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            {isAdmin && (
              <button
                onClick={() => { setZawBulkMode(!zawBulkMode); setZawSelectedIds(new Set()); setZawBulkResults(null) }}
                className={`px-4 py-2 text-sm font-medium rounded-[var(--radius-button)] transition-colors ${
                  zawBulkMode
                    ? 'bg-slate/10 text-charcoal'
                    : 'border border-sage text-sage hover:bg-sage/5'
                }`}
              >
                {zawBulkMode ? 'Anuluj wysyłkę' : 'Wyślij do wielu'}
              </button>
            )}
          </div>

          {/* Tabela lokali */}
          {apartments.length === 0 ? (
            <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
              <p className="text-slate">Brak lokali w systemie.</p>
            </div>
          ) : rates.length === 0 ? (
            <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
              <p className="text-slate">Brak zdefiniowanych stawek.</p>
              <p className="text-sm text-outline mt-1">Dodaj stawki w zakładce Stawki, aby generować zawiadomienia.</p>
            </div>
          ) : (
            <div className="bg-white rounded-[var(--radius-card)] shadow-ambient overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-cream-medium">
                      {zawBulkMode && (
                        <th className="px-3 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={zawSelectedIds.size === apartments.filter((a) => a.owner_resident_id).length && zawSelectedIds.size > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setZawSelectedIds(new Set(apartments.filter((a) => a.owner_resident_id).map((a) => a.id)))
                              } else {
                                setZawSelectedIds(new Set())
                              }
                            }}
                            className="rounded border-cream-deep text-sage focus:ring-sage/30"
                          />
                        </th>
                      )}
                      <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Nr</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Powierzchnia</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Osoby</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Opłata mies.</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apartments.map((apt) => {
                      const monthlyCharge = calcMonthlyCharge(apt)
                      const hasOwner = !!apt.owner_resident_id
                      return (
                        <tr
                          key={apt.id}
                          className={`border-b border-cream last:border-0 transition-colors ${zawBulkMode && !hasOwner ? 'opacity-50' : 'hover:bg-cream/50'}`}
                        >
                          {zawBulkMode && (
                            <td className="px-3 py-3">
                              <input
                                type="checkbox"
                                checked={zawSelectedIds.has(apt.id)}
                                disabled={!hasOwner}
                                onChange={(e) => {
                                  const next = new Set(zawSelectedIds)
                                  if (e.target.checked) next.add(apt.id)
                                  else next.delete(apt.id)
                                  setZawSelectedIds(next)
                                }}
                                className="rounded border-cream-deep text-sage focus:ring-sage/30"
                              />
                            </td>
                          )}
                          <td className="px-5 py-3 font-medium text-charcoal">{apt.number}</td>
                          <td className="px-5 py-3 text-right text-slate">
                            {apt.area_m2 ? `${apt.area_m2} m²` : '—'}
                          </td>
                          <td className="px-5 py-3 text-right text-slate">{apt.declared_occupants || '—'}</td>
                          <td className="px-5 py-3 text-right font-medium text-charcoal">
                            {monthlyCharge > 0 ? `${monthlyCharge.toFixed(2)} zł` : '—'}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleDownloadPdf(apt.id)}
                                disabled={downloadingPdf === apt.id || monthlyCharge === 0}
                                className="p-1.5 text-outline hover:text-sage transition-colors disabled:opacity-50"
                                title="Pobierz PDF"
                              >
                                <DownloadIcon className="w-4 h-4" />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleSendNotification(apt.id)}
                                  disabled={sendingNotification === apt.id || !hasOwner || monthlyCharge === 0}
                                  className="p-1.5 text-outline hover:text-sage transition-colors disabled:opacity-50"
                                  title={!hasOwner ? 'Brak właściciela' : 'Wyślij email'}
                                >
                                  <SendIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bulk send bar — admin only */}
          {isAdmin && zawBulkMode && (
            <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-4 flex items-center justify-between">
              <span className="text-sm text-slate">
                Zaznaczono: {zawSelectedIds.size} {zawSelectedIds.size === 1 ? 'lokal' : 'lokali'}
              </span>
              <button
                onClick={handleZawBulkSend}
                disabled={zawBulkSending || zawSelectedIds.size === 0}
                className="px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50"
              >
                {zawBulkSending ? 'Wysyłanie...' : `Wyślij (${zawSelectedIds.size})`}
              </button>
            </div>
          )}

          {/* Bulk results */}
          {zawBulkResults && (
            <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-charcoal">Wyniki wysyłki</h3>
                <button onClick={() => setZawBulkResults(null)} className="text-outline hover:text-charcoal">
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
              {zawBulkResults.sent.length > 0 && (
                <p className="text-sm text-sage">
                  Wysłano: {zawBulkResults.sent.length} {zawBulkResults.sent.length === 1 ? 'lokal' : 'lokali'}
                  {' '}({zawBulkResults.sent.map((n) => `lok. ${n}`).join(', ')})
                </p>
              )}
              {zawBulkResults.failed.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm text-error font-medium">Błędy ({zawBulkResults.failed.length}):</p>
                  <ul className="text-sm text-slate space-y-0.5">
                    {zawBulkResults.failed.map((f) => (
                      <li key={f.number}>Lokal {f.number}: {f.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
