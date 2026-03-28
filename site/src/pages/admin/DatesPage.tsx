import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRole } from '../../hooks/useRole'
import { PlusIcon, EditIcon, TrashIcon, XIcon } from '../../components/ui/Icons'
import { useConfirm } from '../../components/ui/ConfirmDialog'

interface ImportantDate {
  id: string
  title: string
  date: string
  description: string | null
}

interface DateForm {
  title: string
  date: string
  description: string
}

const emptyForm: DateForm = { title: '', date: '', description: '' }

export default function AdminDatesPage() {
  const { isAdmin } = useRole()
  const [dates, setDates] = useState<ImportantDate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<DateForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { confirm } = useConfirm()

  const fetchDates = async () => {
    const { data } = await supabase
      .from('important_dates')
      .select('id, title, date, description')
      .order('date', { ascending: true })

    if (data) setDates(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchDates()
  }, [])

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
    setShowForm(true)
  }

  const openEdit = (d: ImportantDate) => {
    setEditingId(d.id)
    setForm({
      title: d.title,
      date: d.date,
      description: d.description || '',
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
    if (!form.title.trim() || !form.date) {
      setError('Tytuł i data są wymagane.')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      title: form.title.trim(),
      date: form.date,
      description: form.description.trim() || null,
    }

    if (editingId) {
      const { error: updateError } = await supabase
        .from('important_dates')
        .update(payload)
        .eq('id', editingId)

      if (updateError) {
        setError(updateError.message)
        setSaving(false)
        return
      }
    } else {
      const { error: insertError } = await supabase
        .from('important_dates')
        .insert(payload)

      if (insertError) {
        setError(insertError.message)
        setSaving(false)
        return
      }
    }

    await fetchDates()
    closeForm()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Usuń termin',
      message: 'Czy na pewno chcesz usunąć ten termin?',
      confirmLabel: 'Usuń',
      danger: true,
    })
    if (!ok) return

    setDeleting(id)
    await supabase.from('important_dates').delete().eq('id', id)
    await fetchDates()
    setDeleting(null)
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pl-PL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  const isPast = (dateStr: string) => new Date(dateStr) < new Date(new Date().toISOString().split('T')[0])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate">Ładowanie...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-charcoal">Ważne terminy</h1>
        {isAdmin && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Dodaj termin
          </button>
        )}
      </div>

      {/* Form */}
      {isAdmin && showForm && (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-charcoal">
              {editingId ? 'Edytuj termin' : 'Nowy termin'}
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
              <label className="block text-sm font-medium text-charcoal mb-1">Tytuł *</label>
              <input
                type="text"
                maxLength={255}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Data *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-charcoal mb-1">Opis (opcjonalnie)</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                maxLength={2000}
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage resize-y"
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

      {/* Dates list */}
      {dates.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
          <p className="text-slate">Brak terminów.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dates.map((d) => (
            <div
              key={d.id}
              className={`bg-white rounded-[var(--radius-card)] shadow-ambient p-5 flex items-start justify-between gap-4 ${
                isPast(d.date) ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-[var(--radius-input)] bg-sage-pale/30 flex flex-col items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-sage leading-none">
                    {new Date(d.date).getDate()}
                  </span>
                  <span className="text-[10px] text-sage uppercase mt-0.5">
                    {new Date(d.date).toLocaleDateString('pl-PL', { month: 'short' })}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-charcoal">{d.title}</h3>
                  <p className="text-xs text-outline mt-0.5 capitalize">{formatDate(d.date)}</p>
                  {d.description && (
                    <p className="text-sm text-slate mt-2">{d.description}</p>
                  )}
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(d)}
                    className="p-2 text-outline hover:text-sage transition-colors"
                    title="Edytuj"
                  >
                    <EditIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(d.id)}
                    disabled={deleting === d.id}
                    className="p-2 text-outline hover:text-error transition-colors disabled:opacity-50"
                    title="Usuń"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
