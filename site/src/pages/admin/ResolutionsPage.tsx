import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { PlusIcon, EditIcon, TrashIcon, XIcon } from '../../components/ui/Icons'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'

interface Resolution {
  id: string
  title: string
  description: string | null
  document_id: string | null
  voting_start: string | null
  voting_end: string | null
  status: string
  created_at: string
}

interface VoteResults {
  za: number
  przeciw: number
  wstrzymuje: number
  total: number
}

interface ResolutionForm {
  title: string
  description: string
  voting_start: string
  voting_end: string
  status: string
}

const emptyForm: ResolutionForm = {
  title: '',
  description: '',
  voting_start: '',
  voting_end: '',
  status: 'draft',
}

const statusLabels: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'Szkic', bg: 'bg-cream-deep', text: 'text-slate' },
  voting: { label: 'Głosowanie', bg: 'bg-sage-pale/40', text: 'text-sage' },
  closed: { label: 'Zamknięta', bg: 'bg-error-container', text: 'text-error' },
}

export default function AdminResolutionsPage() {
  const [resolutions, setResolutions] = useState<Resolution[]>([])
  const [results, setResults] = useState<Record<string, VoteResults>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ResolutionForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { confirm } = useConfirm()
  const { toast } = useToast()

  const fetchResolutions = async () => {
    try {
      const data = await api.get<Resolution[]>('/resolutions')
      setResolutions(data)

      // Fetch results for voting/closed resolutions
      const resultsMap: Record<string, VoteResults> = {}
      for (const r of data) {
        if (r.status === 'voting' || r.status === 'closed') {
          try {
            resultsMap[r.id] = await api.get<VoteResults>(`/resolutions/${r.id}/results`)
          } catch { /* ignore */ }
        }
      }
      setResults(resultsMap)
    } catch (e) {
      toast('Błąd ładowania uchwał', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResolutions()
  }, [])

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
    setShowForm(true)
  }

  const openEdit = (r: Resolution) => {
    setEditingId(r.id)
    setForm({
      title: r.title,
      description: r.description || '',
      voting_start: r.voting_start || '',
      voting_end: r.voting_end || '',
      status: r.status,
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
    if (!form.title.trim()) {
      setError('Tytuł jest wymagany.')
      return
    }

    setSaving(true)
    setError(null)

    const payload: Record<string, string | null> = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      voting_start: form.voting_start || null,
      voting_end: form.voting_end || null,
      status: form.status,
    }

    try {
      if (editingId) {
        await api.patch(`/resolutions/${editingId}`, payload)
        toast('Uchwała zaktualizowana', 'success')
      } else {
        await api.post('/resolutions', payload)
        toast('Uchwała utworzona', 'success')
      }
      await fetchResolutions()
      closeForm()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Wystąpił błąd')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Usuń uchwałę',
      message: 'Czy na pewno chcesz usunąć tę uchwałę? Wszystkie oddane głosy zostaną usunięte.',
      confirmLabel: 'Usuń',
      danger: true,
    })
    if (!ok) return

    setDeleting(id)
    try {
      await api.delete(`/resolutions/${id}`)
      toast('Uchwała usunięta', 'success')
      await fetchResolutions()
    } catch {
      toast('Błąd usuwania uchwały', 'error')
    } finally {
      setDeleting(null)
    }
  }

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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-charcoal">Uchwały</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Dodaj uchwałę
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-charcoal">
              {editingId ? 'Edytuj uchwałę' : 'Nowa uchwała'}
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

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Tytuł *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Opis</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage resize-y"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Początek głosowania</label>
                <input
                  type="date"
                  value={form.voting_start}
                  onChange={(e) => setForm({ ...form, voting_start: e.target.value })}
                  className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Koniec głosowania</label>
                <input
                  type="date"
                  value={form.voting_end}
                  onChange={(e) => setForm({ ...form, voting_end: e.target.value })}
                  className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              >
                <option value="draft">Szkic</option>
                <option value="voting">Głosowanie otwarte</option>
                <option value="closed">Zamknięta</option>
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
              {saving ? 'Zapisywanie...' : editingId ? 'Zapisz zmiany' : 'Utwórz'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {resolutions.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
          <p className="text-slate">Brak uchwał. Dodaj pierwszą uchwałę.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {resolutions.map((r) => {
            const status = statusLabels[r.status] || statusLabels.draft
            const voteData = results[r.id]

            return (
              <div key={r.id} className="bg-white rounded-[var(--radius-card)] shadow-ambient p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                      <span className="text-xs text-outline">{formatDate(r.created_at)}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-charcoal">{r.title}</h3>
                    {r.description && (
                      <p className="text-sm text-slate mt-1 line-clamp-2">{r.description}</p>
                    )}
                    {(r.voting_start || r.voting_end) && (
                      <p className="text-xs text-outline mt-2">
                        {r.voting_start && <>Od: {formatDate(r.voting_start)}</>}
                        {r.voting_start && r.voting_end && ' — '}
                        {r.voting_end && <>Do: {formatDate(r.voting_end)}</>}
                      </p>
                    )}
                    {voteData && voteData.total > 0 && (
                      <div className="flex items-center gap-4 mt-3 text-xs">
                        <span className="text-sage font-medium">Za: {voteData.za}</span>
                        <span className="text-error font-medium">Przeciw: {voteData.przeciw}</span>
                        <span className="text-slate font-medium">Wstrzymuje: {voteData.wstrzymuje}</span>
                        <span className="text-outline">Razem: {voteData.total}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(r)}
                      className="p-2 text-outline hover:text-sage transition-colors"
                      title="Edytuj"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deleting === r.id}
                      className="p-2 text-outline hover:text-error transition-colors disabled:opacity-50"
                      title="Usuń"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
