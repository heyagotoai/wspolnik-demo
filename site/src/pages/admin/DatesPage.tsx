import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PlusIcon, EditIcon, TrashIcon, XIcon, VoteIcon, CalendarIcon } from '../../components/ui/Icons'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { mapSupabaseError } from '../../lib/userFacingErrors'
import { DemoHelpCallout } from '../../demo/DemoHelpCallout'

interface ImportantDate {
  id: string
  title: string
  date: string
  description: string | null
}

interface Resolution {
  id: string
  title: string
  voting_start: string | null
  voting_end: string | null
  status: string
}

type UnifiedDate =
  | { type: 'manual'; data: ImportantDate }
  | { type: 'voting_start'; resolutionId: string; title: string; date: string }
  | { type: 'voting_end'; resolutionId: string; title: string; date: string }

interface DateForm {
  title: string
  date: string
  description: string
}

const emptyForm: DateForm = { title: '', date: '', description: '' }

function toKey(u: UnifiedDate): string {
  if (u.type === 'manual') return `manual-${u.data.id}`
  return `${u.type}-${u.resolutionId}`
}

function toDate(u: UnifiedDate): string {
  return u.type === 'manual' ? u.data.date : u.date
}

export default function AdminDatesPage() {
  const [manualDates, setManualDates] = useState<ImportantDate[]>([])
  const [resolutions, setResolutions] = useState<Resolution[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<DateForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { confirm } = useConfirm()

  const fetchAll = async () => {
    const [datesResult, resolutionsResult] = await Promise.all([
      supabase
        .from('important_dates')
        .select('id, title, date, description')
        .order('date', { ascending: true }),
      supabase
        .from('resolutions')
        .select('id, title, voting_start, voting_end, status'),
    ])
    if (datesResult.data) setManualDates(datesResult.data)
    if (resolutionsResult.data) {
      setResolutions(resolutionsResult.data.filter(r => r.voting_start || r.voting_end))
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
  }, [])

  // Build unified sorted list
  const unified: UnifiedDate[] = []

  for (const d of manualDates) {
    unified.push({ type: 'manual', data: d })
  }

  for (const r of resolutions) {
    if (r.voting_start && r.status === 'voting') {
      unified.push({ type: 'voting_start', resolutionId: r.id, title: r.title, date: r.voting_start })
    }
    if (r.voting_end && (r.status === 'voting' || r.status === 'closed')) {
      unified.push({ type: 'voting_end', resolutionId: r.id, title: r.title, date: r.voting_end })
    }
  }

  unified.sort((a, b) => toDate(b).localeCompare(toDate(a)))

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
    setShowForm(true)
  }

  const openEdit = (d: ImportantDate) => {
    setEditingId(d.id)
    setForm({ title: d.title, date: d.date, description: d.description || '' })
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
        setError(mapSupabaseError(updateError))
        setSaving(false)
        return
      }
    } else {
      const { error: insertError } = await supabase
        .from('important_dates')
        .insert(payload)

      if (insertError) {
        setError(mapSupabaseError(insertError))
        setSaving(false)
        return
      }
    }

    await fetchAll()
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
    await fetchAll()
    setDeleting(null)
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pl-PL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  const todayStr = new Date().toISOString().split('T')[0]
  const isPast = (dateStr: string) => dateStr < todayStr
  const isToday = (dateStr: string) => dateStr === todayStr

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
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Dodaj termin
        </button>
      </div>

      <DemoHelpCallout>
        Terminy zgromadzeń, przeglądów technicznych itd. widoczne są także na pulpicie mieszkańca — żeby wszyscy widzieli
        te same daty w kalendarzu wspólnoty.
      </DemoHelpCallout>

      {/* Form */}
      {showForm && (
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

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate">
        <span className="flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5 text-sage" />
          Termin ręczny
        </span>
        <span className="flex items-center gap-1.5">
          <VoteIcon className="w-3.5 h-3.5 text-amber" />
          Termin głosowania (z Uchwał)
        </span>
      </div>

      {/* Dates list */}
      {unified.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
          <p className="text-slate">Brak terminów.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {unified.map((u) => {
            const dateStr = toDate(u)
            const past = isPast(dateStr)
            const today = isToday(dateStr)

            if (u.type === 'manual') {
              const d = u.data
              return (
                <div
                  key={toKey(u)}
                  className={`bg-white rounded-[var(--radius-card)] shadow-ambient p-5 flex items-start justify-between gap-4 ${past ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-[var(--radius-input)] bg-sage-pale/30 flex flex-col items-center justify-center shrink-0">
                      <span className="text-lg font-bold text-sage leading-none">
                        {new Date(dateStr).getDate()}
                      </span>
                      <span className="text-[10px] text-sage uppercase mt-0.5">
                        {new Date(dateStr).toLocaleDateString('pl-PL', { month: 'short' })}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-semibold text-charcoal">{d.title}</h3>
                        {today && (
                          <span className="px-1.5 py-0.5 bg-sage text-white text-[10px] font-bold rounded-full uppercase">
                            Dziś
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-outline capitalize">{formatDate(dateStr)}</p>
                      {d.description && (
                        <p className="text-sm text-slate mt-2">{d.description}</p>
                      )}
                    </div>
                  </div>

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
                </div>
              )
            }

            // Voting date (voting_start / voting_end)
            const isEnd = u.type === 'voting_end'
            const label = isEnd ? 'Koniec głosowania' : 'Początek głosowania'
            const urgentEnd = isEnd && !past && dateStr <= new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]

            return (
              <div
                key={toKey(u)}
                className={`bg-white rounded-[var(--radius-card)] shadow-ambient p-5 flex items-start justify-between gap-4 border-l-2 ${
                  past
                    ? 'opacity-60 border-cream-deep'
                    : urgentEnd
                    ? 'border-error'
                    : 'border-amber'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-[var(--radius-input)] flex flex-col items-center justify-center shrink-0 ${
                    urgentEnd ? 'bg-error-container' : 'bg-amber-light/40'
                  }`}>
                    <span className={`text-lg font-bold leading-none ${urgentEnd ? 'text-error' : 'text-amber'}`}>
                      {new Date(dateStr).getDate()}
                    </span>
                    <span className={`text-[10px] uppercase mt-0.5 ${urgentEnd ? 'text-error' : 'text-amber'}`}>
                      {new Date(dateStr).toLocaleDateString('pl-PL', { month: 'short' })}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <VoteIcon className={`w-3.5 h-3.5 shrink-0 ${urgentEnd ? 'text-error' : 'text-amber'}`} />
                      <span className={`text-[11px] font-semibold uppercase tracking-wide ${urgentEnd ? 'text-error' : 'text-amber'}`}>
                        {label}
                      </span>
                      {today && (
                        <span className="px-1.5 py-0.5 bg-amber text-white text-[10px] font-bold rounded-full uppercase">
                          Dziś
                        </span>
                      )}
                      {urgentEnd && !today && (
                        <span className="px-1.5 py-0.5 bg-error-container text-error text-[10px] font-bold rounded-full uppercase">
                          Wkrótce
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-charcoal">{u.title}</h3>
                    <p className="text-xs text-outline capitalize mt-0.5">{formatDate(dateStr)}</p>
                  </div>
                </div>
                <Link to="/admin/uchwaly" className="text-xs text-outline hover:text-sage transition-colors shrink-0 self-center">Uchwały →</Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
