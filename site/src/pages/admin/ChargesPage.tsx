import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { PlusIcon, TrashIcon, XIcon } from '../../components/ui/Icons'

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
  apartment_number?: string
}

interface ChargeForm {
  apartment_id: string
  month: string
  type: string
  amount: string
  description: string
}

const chargeTypes: Record<string, string> = {
  eksploatacja: 'Eksploatacja',
  fundusz_remontowy: 'Fundusz remontowy',
  woda: 'Woda',
  smieci: 'Śmieci',
  ogrzewanie: 'Ogrzewanie',
  inne: 'Inne',
}

const emptyForm: ChargeForm = {
  apartment_id: '',
  month: new Date().toISOString().slice(0, 7) + '-01',
  type: 'eksploatacja',
  amount: '',
  description: '',
}

export default function AdminChargesPage() {
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [charges, setCharges] = useState<Charge[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ChargeForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7))
  const [filterApartment, setFilterApartment] = useState<string>('all')

  const fetchData = async () => {
    const [aptsRes, chargesRes] = await Promise.all([
      supabase
        .from('apartments')
        .select('id, number, area_m2, owner_resident_id')
        .order('number', { ascending: true }),
      supabase
        .from('charges')
        .select('id, apartment_id, month, type, amount, description')
        .order('month', { ascending: false }),
    ])

    if (aptsRes.data) {
      setApartments(aptsRes.data.map((a) => ({
        id: a.id,
        number: a.number,
        area_m2: a.area_m2,
        owner_name: null,
      })))
    }
    if (chargesRes.data) setCharges(chargesRes.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openAdd = () => {
    setForm({
      ...emptyForm,
      apartment_id: apartments[0]?.id || '',
      month: filterMonth + '-01',
    })
    setError(null)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setForm(emptyForm)
    setError(null)
  }

  const handleSave = async () => {
    if (!form.apartment_id || !form.month || !form.amount) {
      setError('Lokal, miesiąc i kwota są wymagane.')
      return
    }

    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      setError('Podaj prawidłową kwotę.')
      return
    }

    setSaving(true)
    setError(null)

    const { error: insertError } = await supabase.from('charges').insert({
      apartment_id: form.apartment_id,
      month: form.month,
      type: form.type,
      amount,
      description: form.description.trim() || null,
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    await fetchData()
    closeForm()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć to naliczenie?')) return

    setDeleting(id)
    await supabase.from('charges').delete().eq('id', id)
    await fetchData()
    setDeleting(null)
  }

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
        <h1 className="text-2xl font-bold text-charcoal">Naliczenia</h1>
        <button
          onClick={openAdd}
          disabled={apartments.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50"
        >
          <PlusIcon className="w-4 h-4" />
          Dodaj naliczenie
        </button>
      </div>

      {apartments.length === 0 && (
        <div className="bg-amber-light/30 rounded-[var(--radius-card)] p-4 text-sm text-amber">
          Brak lokali w systemie. Najpierw dodaj lokale, aby móc tworzyć naliczenia.
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-charcoal">Nowe naliczenie</h2>
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
              <label className="block text-sm font-medium text-charcoal mb-1">Lokal *</label>
              <select
                value={form.apartment_id}
                onChange={(e) => setForm({ ...form, apartment_id: e.target.value })}
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
                value={form.month.slice(0, 7)}
                onChange={(e) => setForm({ ...form, month: e.target.value + '-01' })}
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Typ *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
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
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-charcoal mb-1">Opis (opcjonalnie)</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
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
                    <td className="px-5 py-3 text-slate">{c.description || '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDelete(c.id)}
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
    </div>
  )
}
