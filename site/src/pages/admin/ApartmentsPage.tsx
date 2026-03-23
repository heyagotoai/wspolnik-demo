import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { PlusIcon, EditIcon, TrashIcon, XIcon } from '../../components/ui/Icons'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/ConfirmDialog'

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
  const [showBulkDateForm, setShowBulkDateForm] = useState(false)
  const [bulkDate, setBulkDate] = useState('')
  const [bulkDateSaving, setBulkDateSaving] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { confirm } = useConfirm()

  const fetchData = async () => {
    const [aptsRes, resRes] = await Promise.all([
      supabase
        .from('apartments')
        .select('id, number, area_m2, share, declared_occupants, initial_balance, initial_balance_date, owner_resident_id')
        .order('number', { ascending: true }),
      supabase
        .from('residents')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name', { ascending: true }),
    ])

    if (resRes.data) setResidents(resRes.data)

    if (aptsRes.data) {
      const mapped = aptsRes.data.map((a) => ({
        ...a,
        owner_name: resRes.data?.find((r) => r.id === a.owner_resident_id)?.full_name || null,
      }))
      mapped.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
      setApartments(mapped)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (showForm) {
      setTimeout(() => formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 50)
    }
  }, [showForm])

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
    (a) => a.initial_balance !== 0 && !a.initial_balance_date,
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
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Dodaj lokal
        </button>
      </div>

      {/* Bulk balance date banner */}
      {aptsWithBalanceNoDate.length > 0 && !showBulkDateForm && (
        <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-card)] p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-amber-800">
            {aptsWithBalanceNoDate.length === 1
              ? '1 lokal ma saldo początkowe bez ustawionej daty.'
              : `${aptsWithBalanceNoDate.length} lokali ma saldo początkowe bez ustawionej daty.`}
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
              ? '1 lokalu z saldem początkowym bez daty'
              : `${aptsWithBalanceNoDate.length} lokali z saldem początkowym bez daty`}:
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
                  <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Nr</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Powierzchnia</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Udział</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Mieszkańcy</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Saldo pocz.</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Właściciel</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {apartments.map((apt) => (
                  <tr key={apt.id} className="border-b border-cream last:border-0 hover:bg-cream/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-charcoal">{apt.number}</td>
                    <td className="px-5 py-3 text-slate">{apt.area_m2 ? `${apt.area_m2} m²` : '—'}</td>
                    <td className="px-5 py-3 text-slate">{apt.share ? `${(apt.share * 100).toFixed(2)}%` : '—'}</td>
                    <td className="px-5 py-3 text-slate">{apt.declared_occupants || 0}</td>
                    <td className={`px-5 py-3 text-right ${apt.initial_balance < 0 ? 'text-error' : apt.initial_balance > 0 ? 'text-sage' : 'text-slate'}`}>
                      <div className="font-medium">{apt.initial_balance != null ? `${apt.initial_balance.toFixed(2)} zł` : '—'}</div>
                      {apt.initial_balance_date && (
                        <div className="text-xs text-outline">na {apt.initial_balance_date}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate">{apt.owner_name || '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
