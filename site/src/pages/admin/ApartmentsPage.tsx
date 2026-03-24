import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { PlusIcon, EditIcon, TrashIcon, XIcon, PrinterIcon, SendIcon } from '../../components/ui/Icons'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { communityInfo, saldoPrintCopy } from '../../data/mockData'

interface Resident {
  id: string
  full_name: string
  email: string
}

interface Apartment {
  id: string
  number: string
  area_m2: number | null
  share: number | null
  declared_occupants: number
  initial_balance: number
  initial_balance_date: string | null
  owner_resident_id: string | null
  owner_name: string | null
}

interface BulkResults {
  sent: string[]
  failed: { number: string; error: string }[]
}

interface ApartmentForm {
  number: string
  area_m2: string
  share: string
  declared_occupants: string
  initial_balance: string
  initial_balance_date: string
  owner_resident_id: string
}

const emptyForm: ApartmentForm = { number: '', area_m2: '', share: '', declared_occupants: '', initial_balance: '', initial_balance_date: '', owner_resident_id: '' }

export default function ApartmentsPage() {
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ApartmentForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [balances, setBalances] = useState<Record<string, { charges: number; payments: number; balance: number }>>({})
  const [printingApt, setPrintingApt] = useState<Apartment | null>(null)
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkResults, setBulkResults] = useState<BulkResults | null>(null)
  const [showBulkDateForm, setShowBulkDateForm] = useState(false)
  const [bulkDate, setBulkDate] = useState('')
  const [bulkDateSaving, setBulkDateSaving] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { confirm } = useConfirm()

  const fetchData = async () => {
    const [aptsRes, resRes, chargesRes, paymentsRes] = await Promise.all([
      supabase
        .from('apartments')
        .select('id, number, area_m2, share, declared_occupants, initial_balance, initial_balance_date, owner_resident_id')
        .order('number', { ascending: true }),
      supabase
        .from('residents')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name', { ascending: true }),
      supabase
        .from('charges')
        .select('apartment_id, amount'),
      supabase
        .from('payments')
        .select('apartment_id, amount')
        .eq('confirmed_by_admin', true),
    ])

    if (resRes.data) setResidents(resRes.data)

    // Calculate balances per apartment
    const balMap: Record<string, { charges: number; payments: number; balance: number }> = {}
    for (const c of chargesRes.data || []) {
      if (!balMap[c.apartment_id]) balMap[c.apartment_id] = { charges: 0, payments: 0, balance: 0 }
      balMap[c.apartment_id].charges += Number(c.amount)
    }
    for (const p of paymentsRes.data || []) {
      if (!balMap[p.apartment_id]) balMap[p.apartment_id] = { charges: 0, payments: 0, balance: 0 }
      balMap[p.apartment_id].payments += Number(p.amount)
    }

    if (aptsRes.data) {
      for (const a of aptsRes.data) {
        if (!balMap[a.id]) balMap[a.id] = { charges: 0, payments: 0, balance: 0 }
        const ib = Number(a.initial_balance) || 0
        balMap[a.id].balance = ib + balMap[a.id].payments - balMap[a.id].charges
      }

      const mapped = aptsRes.data.map((a) => ({
        ...a,
        owner_name: resRes.data?.find((r) => r.id === a.owner_resident_id)?.full_name || null,
      }))
      mapped.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
      setApartments(mapped)
    }

    setBalances(balMap)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (showForm) {
      setTimeout(() => formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 50)
    }
  }, [showForm, editingId])

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
    setShowForm(true)
  }

  const openEdit = (apt: Apartment) => {
    setEditingId(apt.id)
    setForm({
      number: apt.number,
      area_m2: apt.area_m2?.toString() || '',
      share: apt.share ? parseFloat((apt.share * 100).toFixed(10)).toString() : '',
      declared_occupants: apt.declared_occupants?.toString() || '0',
      initial_balance: apt.initial_balance ? apt.initial_balance.toString() : '0',
      initial_balance_date: apt.initial_balance_date || '',
      owner_resident_id: apt.owner_resident_id || '',
    })
    setError(null)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
  }

  const handleSave = async () => {
    if (!form.number.trim()) {
      setError('Numer lokalu jest wymagany.')
      return
    }

    if (form.area_m2) {
      const area = parseFloat(form.area_m2)
      if (isNaN(area) || area <= 0 || area > 10000) {
        setError('Powierzchnia musi być liczbą z zakresu 0.01–10000 m².')
        return
      }
    }

    if (form.share) {
      const share = parseFloat(form.share)
      if (isNaN(share) || share <= 0 || share > 100) {
        setError('Udział musi być liczbą z zakresu 0.01–100%.')
        return
      }
    }

    setSaving(true)
    setError(null)

    const payload = {
      number: form.number.trim(),
      area_m2: form.area_m2 ? parseFloat(form.area_m2) : null,
      share: form.share ? parseFloat(form.share) / 100 : null,
      declared_occupants: form.declared_occupants ? parseInt(form.declared_occupants) : 0,
      initial_balance: form.initial_balance ? parseFloat(form.initial_balance) : 0,
      initial_balance_date: form.initial_balance_date || null,
      owner_resident_id: form.owner_resident_id || null,
    }

    if (editingId) {
      const { error: updateErr } = await supabase
        .from('apartments')
        .update(payload)
        .eq('id', editingId)

      if (updateErr) {
        setError(updateErr.message)
        setSaving(false)
        return
      }
      toast('Lokal zaktualizowany.', 'success')
    } else {
      const { error: insertErr } = await supabase
        .from('apartments')
        .insert(payload)

      if (insertErr) {
        setError(insertErr.code === '23505' ? 'Lokal o tym numerze już istnieje.' : insertErr.message)
        setSaving(false)
        return
      }
      toast('Lokal dodany.', 'success')
    }

    await fetchData()
    closeForm()
    setSaving(false)
  }

  const handleDelete = async (apt: Apartment) => {
    const ok = await confirm({
      title: 'Usuń lokal',
      message: `Czy na pewno chcesz usunąć lokal ${apt.number}? Usunięte zostaną również wszystkie powiązane naliczenia.`,
      confirmLabel: 'Usuń',
      danger: true,
    })
    if (!ok) return

    setDeleting(apt.id)
    const { error: delErr } = await supabase.from('apartments').delete().eq('id', apt.id)
    if (delErr) {
      toast('Nie udało się usunąć lokalu.', 'error')
    } else {
      toast('Lokal usunięty.', 'success')
    }
    await fetchData()
    setDeleting(null)
  }

  const aptsWithBalanceNoDate = apartments.filter(
    (a) => !a.initial_balance_date,
  )

  const handleBulkDate = async () => {
    if (!bulkDate) return

    setBulkDateSaving(true)
    const ids = aptsWithBalanceNoDate.map((a) => a.id)

    let hasError = false
    for (const id of ids) {
      const { error: updateErr } = await supabase
        .from('apartments')
        .update({ initial_balance_date: bulkDate })
        .eq('id', id)
      if (updateErr) hasError = true
    }

    if (hasError) {
      toast('Nie udało się zaktualizować niektórych lokali.', 'error')
    } else {
      toast(`Data salda ustawiona na ${bulkDate} dla ${ids.length} lokali.`, 'success')
    }

    await fetchData()
    setShowBulkDateForm(false)
    setBulkDate('')
    setBulkDateSaving(false)
  }

  const handlePrint = (apt: Apartment) => {
    setPrintingApt(apt)
    setTimeout(() => {
      document.body.classList.add('saldo-printing')
      window.print()
    }, 100)
  }

  useEffect(() => {
    if (!printingApt) return
    const onAfterPrint = () => {
      document.body.classList.remove('saldo-printing')
    }
    window.addEventListener('afterprint', onAfterPrint)
    return () => {
      window.removeEventListener('afterprint', onAfterPrint)
      document.body.classList.remove('saldo-printing')
    }
  }, [printingApt])

  const handleSendEmail = async (apt: Apartment) => {
    if (!apt.owner_resident_id) {
      toast('Lokal nie ma przypisanego właściciela.', 'error')
      return
    }
    const ok = await confirm({
      title: 'Wyślij powiadomienie',
      message: `Wysłać informację o saldzie na email właściciela lokalu ${apt.number}?`,
      confirmLabel: 'Wyślij',
    })
    if (!ok) return

    setSendingEmail(apt.id)
    try {
      const result = await api.post<{ detail: string }>(`/charges/balance-notification/${apt.id}`, {})
      toast(result.detail, 'success')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Błąd wysyłki emaila', 'error')
    } finally {
      setSendingEmail(null)
    }
  }

  const aptHasEmail = (apt: Apartment): boolean => {
    if (!apt.owner_resident_id) return false
    const owner = residents.find((r) => r.id === apt.owner_resident_id)
    return !!(owner?.email)
  }

  const aptsWithEmail = apartments.filter(aptHasEmail)
  const selectedWithEmail = [...selectedIds].filter((id) => {
    const apt = apartments.find((a) => a.id === id)
    return apt ? aptHasEmail(apt) : false
  })
  const selectedWithoutEmail = [...selectedIds].filter((id) => {
    const apt = apartments.find((a) => a.id === id)
    return apt ? !aptHasEmail(apt) : false
  })

  const toggleBulkMode = () => {
    setBulkMode((prev) => !prev)
    setSelectedIds(new Set())
    setBulkResults(null)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === aptsWithEmail.length && aptsWithEmail.every((a) => selectedIds.has(a.id))) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(aptsWithEmail.map((a) => a.id)))
    }
  }

  const handleBulkSend = async () => {
    if (selectedWithEmail.length === 0) {
      toast('Zaznacz co najmniej jeden lokal z adresem email.', 'error')
      return
    }

    const skippedNums = selectedWithoutEmail
      .map((id) => apartments.find((a) => a.id === id)?.number)
      .filter(Boolean)

    const confirmMsg = skippedNums.length > 0
      ? `Wyślesz powiadomienia do ${selectedWithEmail.length} lokali.\nPominięte (brak emaila): lok. ${skippedNums.join(', ')}.`
      : `Wyślesz powiadomienia o saldzie do ${selectedWithEmail.length} lokali.`

    const ok = await confirm({
      title: 'Wyślij powiadomienia',
      message: confirmMsg,
      confirmLabel: 'Wyślij',
    })
    if (!ok) return

    setBulkSending(true)
    setBulkResults(null)
    try {
      const result = await api.post<BulkResults>('/charges/balance-notification-bulk', {
        apartment_ids: selectedWithEmail,
      })
      setBulkResults(result)
      if (result.failed.length === 0) {
        toast(`Wysłano powiadomienia do ${result.sent.length} lokali.`, 'success')
      } else {
        toast(`Wysłano: ${result.sent.length}, błędy: ${result.failed.length}.`, 'error')
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Błąd wysyłki masowej', 'error')
    } finally {
      setBulkSending(false)
    }
  }

  const handleRetryFailed = async () => {
    if (!bulkResults || bulkResults.failed.length === 0) return
    const failedNumbers = new Set(bulkResults.failed.map((f) => f.number))
    const failedIds = apartments
      .filter((a) => failedNumbers.has(a.number) && aptHasEmail(a))
      .map((a) => a.id)

    if (failedIds.length === 0) {
      toast('Brak lokali do ponowienia (brak emaila lub lokal nie istnieje).', 'error')
      return
    }

    setBulkSending(true)
    try {
      const result = await api.post<BulkResults>('/charges/balance-notification-bulk', {
        apartment_ids: failedIds,
      })
      setBulkResults((prev) => ({
        sent: [...(prev?.sent || []), ...result.sent],
        failed: result.failed,
      }))
      if (result.failed.length === 0) {
        toast(`Ponowienie: wysłano do ${result.sent.length} lokali.`, 'success')
      } else {
        toast(`Ponowienie: wysłano ${result.sent.length}, błędy: ${result.failed.length}.`, 'error')
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Błąd ponowienia wysyłki', 'error')
    } finally {
      setBulkSending(false)
    }
  }

  const formatCurrency = (n: number) => `${n.toFixed(2)} zł`

  const formatAmountPl = (n: number) =>
    `${n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`

  const saldoPrintSnapshot = useMemo(() => {
    if (!printingApt) return null
    const issueDate = new Date()
    const due = new Date(issueDate)
    due.setDate(due.getDate() + 14)
    return {
      dateLabel: issueDate.toLocaleDateString('pl-PL'),
      dueIn14Label: due.toLocaleDateString('pl-PL'),
    }
  }, [printingApt])

  const printBalance = printingApt ? (balances[printingApt.id]?.balance ?? 0) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate">Ładowanie...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-charcoal">Lokale</h1>
        <div className="flex items-center gap-2">
          {apartments.length > 0 && (
            <button
              onClick={toggleBulkMode}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-[var(--radius-button)] transition-colors ${
                bulkMode
                  ? 'bg-outline text-white hover:bg-slate'
                  : 'border border-outline text-slate hover:text-charcoal hover:border-charcoal'
              }`}
            >
              <SendIcon className="w-4 h-4" />
              {bulkMode ? 'Anuluj wysyłkę' : 'Wyślij do wielu'}
            </button>
          )}
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Dodaj lokal
          </button>
        </div>
      </div>

      {/* Bulk balance date banner */}
      {aptsWithBalanceNoDate.length > 0 && !showBulkDateForm && (
        <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-card)] p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-amber-800">
            {aptsWithBalanceNoDate.length === 1
              ? '1 lokal nie ma ustawionej daty salda początkowego.'
              : `${aptsWithBalanceNoDate.length} lokali nie ma ustawionej daty salda początkowego.`}
            {' '}Uzupełnij, aby system mógł ostrzegać przed podwójnym naliczeniem.
          </p>
          <button
            onClick={() => setShowBulkDateForm(true)}
            className="shrink-0 px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-amber-700 transition-colors"
          >
            Ustaw datę
          </button>
        </div>
      )}

      {showBulkDateForm && (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-charcoal">Ustaw datę salda początkowego</h2>
            <button onClick={() => { setShowBulkDateForm(false); setBulkDate('') }} className="text-outline hover:text-charcoal">
              <XIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-slate mb-4">
            Data zostanie ustawiona dla {aptsWithBalanceNoDate.length === 1
              ? '1 lokalu bez daty salda'
              : `${aptsWithBalanceNoDate.length} lokali bez daty salda`}:
            {' '}{aptsWithBalanceNoDate.map((a) => a.number).join(', ')}.
          </p>
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Data salda</label>
              <input
                type="date"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
                className="px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            <button
              onClick={handleBulkDate}
              disabled={!bulkDate || bulkDateSaving}
              className="px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50"
            >
              {bulkDateSaving ? 'Zapisywanie...' : 'Zapisz'}
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div ref={formRef} className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-charcoal">
              {editingId ? 'Edytuj lokal' : 'Nowy lokal'}
            </h2>
            <button onClick={closeForm} className="text-outline hover:text-charcoal">
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-error-container text-error text-sm rounded-[var(--radius-input)]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Numer lokalu *</label>
              <input
                type="text"
                maxLength={20}
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                placeholder="np. 1, 2A, 10"
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Powierzchnia (m²)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.area_m2}
                onChange={(e) => setForm({ ...form, area_m2: e.target.value })}
                placeholder="np. 52.30"
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Udział w nieruchomości (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.share}
                onChange={(e) => setForm({ ...form, share: e.target.value })}
                placeholder="np. 5.23"
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Liczba mieszkańców</label>
              <input
                type="number"
                step="1"
                min="0"
                value={form.declared_occupants}
                onChange={(e) => setForm({ ...form, declared_occupants: e.target.value })}
                placeholder="np. 2"
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Saldo początkowe (PLN)</label>
              <input
                type="number"
                step="0.01"
                value={form.initial_balance}
                onChange={(e) => setForm({ ...form, initial_balance: e.target.value })}
                placeholder="0.00 (ujemne = zaległość)"
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Data salda początkowego</label>
              <input
                type="date"
                value={form.initial_balance_date}
                onChange={(e) => setForm({ ...form, initial_balance_date: e.target.value })}
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
              <p className="text-xs text-outline mt-1">Na jaki dzień obowiązuje saldo (do ochrony przed podwójnym naliczeniem)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Właściciel</label>
              <select
                value={form.owner_resident_id}
                onChange={(e) => setForm({ ...form, owner_resident_id: e.target.value })}
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              >
                <option value="">— brak —</option>
                {residents.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.full_name} ({r.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={closeForm}
              className="px-4 py-2 text-sm font-medium text-slate hover:text-charcoal transition-colors"
            >
              Anuluj
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50"
            >
              {saving ? 'Zapisywanie...' : 'Zapisz'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {apartments.length === 0 && !showForm ? (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
          <p className="text-slate mb-2">Brak lokali w systemie.</p>
          <p className="text-sm text-outline">Kliknij „Dodaj lokal", aby dodać pierwszy lokal.</p>
        </div>
      ) : apartments.length > 0 && (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-medium">
                  {bulkMode && (
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={aptsWithEmail.length > 0 && aptsWithEmail.every((a) => selectedIds.has(a.id))}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 accent-sage cursor-pointer"
                        title="Zaznacz wszystkie z emailem"
                      />
                    </th>
                  )}
                  <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Nr</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Powierzchnia</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Udział</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Mieszkańcy</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Saldo pocz.</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Saldo</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Właściciel</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {apartments.map((apt) => {
                  const hasEmail = aptHasEmail(apt)
                  return (
                  <tr key={apt.id} className={`border-b border-cream last:border-0 transition-colors ${bulkMode && !hasEmail ? 'opacity-50' : 'hover:bg-cream/50'}`}>
                    {bulkMode && (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(apt.id)}
                          onChange={() => toggleSelect(apt.id)}
                          disabled={!hasEmail}
                          className="w-4 h-4 accent-sage cursor-pointer disabled:cursor-not-allowed"
                          title={!hasEmail ? 'Brak adresu email — lokal zostanie pominięty' : undefined}
                        />
                      </td>
                    )}
                    <td className="px-5 py-3 font-medium text-charcoal">
                      <span>{apt.number}</span>
                      {bulkMode && !hasEmail && (
                        <span className="ml-1.5 text-amber-500 text-xs" title="Brak adresu email">✕</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate">{apt.area_m2 ? `${apt.area_m2} m²` : '—'}</td>
                    <td className="px-5 py-3 text-slate">{apt.share ? `${(apt.share * 100).toFixed(2)}%` : '—'}</td>
                    <td className="px-5 py-3 text-slate">{apt.declared_occupants || 0}</td>
                    <td className={`px-5 py-3 text-right ${apt.initial_balance < 0 ? 'text-error' : apt.initial_balance > 0 ? 'text-sage' : 'text-slate'}`}>
                      <div className="font-medium">{apt.initial_balance != null ? `${apt.initial_balance.toFixed(2)} zł` : '—'}</div>
                      {apt.initial_balance_date && (
                        <div className="text-xs text-outline">na {apt.initial_balance_date}</div>
                      )}
                    </td>
                    <td className={`px-5 py-3 text-right font-medium ${(balances[apt.id]?.balance ?? 0) < 0 ? 'text-error' : (balances[apt.id]?.balance ?? 0) > 0 ? 'text-sage' : 'text-slate'}`}>
                      {formatCurrency(balances[apt.id]?.balance ?? 0)}
                    </td>
                    <td className="px-5 py-3 text-slate">{apt.owner_name || '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handlePrint(apt)}
                          className="p-1.5 text-outline hover:text-sage transition-colors"
                          title="Drukuj saldo"
                        >
                          <PrinterIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSendEmail(apt)}
                          disabled={sendingEmail === apt.id}
                          className="p-1.5 text-outline hover:text-sage transition-colors disabled:opacity-50"
                          title="Wyślij powiadomienie email"
                        >
                          <SendIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(apt)}
                          className="p-1.5 text-outline hover:text-sage transition-colors"
                          title="Edytuj"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(apt)}
                          disabled={deleting === apt.id}
                          className="p-1.5 text-outline hover:text-error transition-colors disabled:opacity-50"
                          title="Usuń"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
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

      {/* Bulk send action bar */}
      {bulkMode && (
        <div className=”sticky bottom-4 z-10”>
          <div className=”bg-white border border-cream-deep rounded-[var(--radius-card)] shadow-lg px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3”>
            <div className=”flex-1 text-sm”>
              {selectedIds.size === 0 ? (
                <span className=”text-slate”>Zaznacz lokale, do których chcesz wysłać powiadomienie o saldzie.</span>
              ) : (
                <span className=”text-charcoal font-medium”>
                  Zaznaczono: {selectedWithEmail.length} {selectedWithEmail.length === 1 ? 'lokal' : 'lokali'} z emailem
                  {selectedWithoutEmail.length > 0 && (
                    <span className=”text-amber-600 ml-2”>
                      · {selectedWithoutEmail.length} {selectedWithoutEmail.length === 1 ? 'lokal zostanie pominięty' : 'lokale zostaną pominięte'} (brak emaila)
                    </span>
                  )}
                </span>
              )}
            </div>
            <button
              onClick={handleBulkSend}
              disabled={bulkSending || selectedWithEmail.length === 0}
              className=”flex items-center gap-2 px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50 shrink-0”
            >
              <SendIcon className=”w-4 h-4” />
              {bulkSending ? 'Wysyłanie...' : `Wyślij (${selectedWithEmail.length})`}
            </button>
          </div>
        </div>
      )}

      {/* Bulk send results */}
      {bulkResults && (
        <div className=”bg-white rounded-[var(--radius-card)] shadow-ambient p-5 space-y-3”>
          <div className=”flex items-center justify-between”>
            <h3 className=”font-semibold text-charcoal text-sm”>Wyniki wysyłki</h3>
            <button onClick={() => setBulkResults(null)} className=”text-outline hover:text-charcoal”>
              <XIcon className=”w-4 h-4” />
            </button>
          </div>
          {bulkResults.sent.length > 0 && (
            <p className=”text-sm text-sage font-medium”>
              ✓ Wysłano: {bulkResults.sent.length} {bulkResults.sent.length === 1 ? 'lokal' : 'lokali'}
              {' '}({bulkResults.sent.map((n) => `lok. ${n}`).join(', ')})
            </p>
          )}
          {bulkResults.failed.length > 0 && (
            <div className=”space-y-1”>
              <p className=”text-sm text-error font-medium”>✗ Błędy ({bulkResults.failed.length}):</p>
              <ul className=”text-sm text-slate space-y-0.5 pl-4”>
                {bulkResults.failed.map((f) => (
                  <li key={f.number}>
                    <span className=”text-charcoal font-medium”>Lok. {f.number}</span> — {f.error}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleRetryFailed}
                disabled={bulkSending}
                className=”mt-2 px-3 py-1.5 border border-sage text-sage text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage/10 transition-colors disabled:opacity-50”
              >
                {bulkSending ? 'Ponawiam...' : 'Ponów dla błędów'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Wydruk salda — portal do body + ukrycie #root przy druku (jedna strona, bez „pustych” kartek) */}
      {printingApt &&
        saldoPrintSnapshot &&
        createPortal(
          <div className="print-area hidden print:block">
            <div className="p-8 max-w-2xl mx-auto font-sans text-sm text-charcoal print:text-black leading-relaxed">
              <header className="flex flex-row justify-between items-start gap-4 mb-8">
                <div className="flex items-start gap-4">
                  <img
                    src="/logo.png"
                    alt=""
                    className="h-16 w-16 shrink-0 object-contain print:block"
                  />
                  <div>
                    <p className="font-bold text-base">{communityInfo.name}</p>
                    <p>{communityInfo.city}</p>
                    <p>{communityInfo.address.replace(/^ul\./i, 'Ul.')}</p>
                  </div>
                </div>
                <p className="text-right whitespace-nowrap shrink-0">Chojnice, {saldoPrintSnapshot.dateLabel}</p>
              </header>

              <h1 className="text-center text-xl font-bold tracking-wide mb-8">SALDO</h1>

              <p className="text-center mb-6 max-w-lg mx-auto">
                {communityInfo.name} informuje, iż dla lokalu nr <strong>{printingApt.number}</strong> stan konta na dzień{' '}
                <strong>{saldoPrintSnapshot.dateLabel}</strong> wynosi: <strong>{formatAmountPl(printBalance)}</strong>.
              </p>

              <div className="text-center space-y-4 text-sm border-t border-charcoal/20 pt-6">
                {printBalance < 0 && (
                  <p>
                    {saldoPrintCopy.paymentDueIntro} <strong>{saldoPrintSnapshot.dueIn14Label}</strong>
                  </p>
                )}
                {printBalance > 0 && (
                  <div className="border border-charcoal/40 rounded px-4 py-3 max-w-lg mx-auto text-center text-sm">
                    {saldoPrintCopy.overpaymentSettlement}
                  </div>
                )}
                <p>{saldoPrintCopy.paymentRule}</p>
                <p className="text-base font-bold tracking-wide">{communityInfo.bankAccountFormatted}</p>
                <p className="text-xs max-w-md mx-auto">{saldoPrintCopy.transferNote}</p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
