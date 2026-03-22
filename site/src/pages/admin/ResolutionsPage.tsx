import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { PlusIcon, EditIcon, TrashIcon, XIcon, DownloadIcon } from '../../components/ui/Icons'
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

interface VoteDetail {
  resident_id: string
  full_name: string
  apartment_number: string | null
  vote: string
  voted_at: string
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
  const [editingOriginalStatus, setEditingOriginalStatus] = useState<string | null>(null)
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
    setEditingOriginalStatus(r.status)
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
    if (form.title.trim().length < 3) {
      setError('Tytuł musi mieć min. 3 znaki.')
      return
    }
    if (form.voting_start && form.voting_end && form.voting_end < form.voting_start) {
      setError('Data końca głosowania musi być późniejsza niż data początku.')
      return
    }

    // Warn when resetting to draft — votes will be deleted
    const resettingToDraft =
      editingId &&
      form.status === 'draft' &&
      editingOriginalStatus !== null &&
      ['voting', 'closed'].includes(editingOriginalStatus)

    if (resettingToDraft) {
      const voteCount = results[editingId!]?.total ?? 0
      const voteInfo = voteCount > 0 ? ` Zostaną usunięte ${voteCount} oddane głosy.` : ''
      const ok = await confirm({
        title: 'Cofnięcie uchwały do szkicu',
        message: `Cofnięcie do szkicu zresetuje głosowanie.${voteInfo} Czy na pewno chcesz kontynuować?`,
        confirmLabel: 'Cofnij do szkicu',
        danger: true,
      })
      if (!ok) return
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
        toast(
          form.status === 'draft' && resettingToDraft
            ? 'Uchwała cofnięta do szkicu, głosy usunięte'
            : 'Uchwała zaktualizowana',
          'success',
        )
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

  const exportVotingPdf = async (r: Resolution) => {
    let voteDetails: VoteDetail[] = []
    try {
      voteDetails = await api.get<VoteDetail[]>(`/resolutions/${r.id}/votes`)
    } catch {
      toast('Błąd pobierania listy głosów', 'error')
      return
    }

    const voteData = results[r.id]
    const status = statusLabels[r.status] || statusLabels.draft
    const generated = new Date().toLocaleString('pl-PL')

    const percentOf = (n: number) =>
      voteData && voteData.total > 0 ? ((n / voteData.total) * 100).toFixed(1) + '%' : '—'

    const html = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Wyniki głosowania — ${r.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 40px; font-size: 13px; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { color: #64748b; font-size: 12px; margin-bottom: 28px; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-bottom: 12px; }
    .badge-voting { background: #d1fae5; color: #065f46; }
    .badge-closed { background: #fee2e2; color: #991b1b; }
    .badge-draft  { background: #f1f5f9; color: #475569; }
    section { margin-bottom: 24px; }
    h2 { font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    p { line-height: 1.6; color: #334155; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { text-align: left; padding: 8px 12px; background: #f8fafc; font-size: 12px; font-weight: 600; color: #475569; border: 1px solid #e2e8f0; }
    td { padding: 8px 12px; border: 1px solid #e2e8f0; }
    .vote-za { color: #065f46; font-weight: 700; }
    .vote-przeciw { color: #991b1b; font-weight: 700; }
    .vote-wstrzymuje { color: #475569; font-weight: 700; }
    .vote-total { font-weight: 700; }
    .bar-row td { padding: 4px 12px; }
    .bar { height: 10px; border-radius: 5px; }
    .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <span class="badge badge-${r.status}">${status.label}</span>
  <h1>${r.title}</h1>
  <p class="subtitle">Wygenerowano: ${generated}</p>

  ${r.description ? `<section>
    <h2>Opis uchwały</h2>
    <p>${r.description.replace(/\n/g, '<br>')}</p>
  </section>` : ''}

  ${r.voting_start || r.voting_end ? `<section>
    <h2>Okres głosowania</h2>
    <p>
      ${r.voting_start ? 'Od: ' + formatDate(r.voting_start) : ''}
      ${r.voting_start && r.voting_end ? ' &mdash; ' : ''}
      ${r.voting_end ? 'Do: ' + formatDate(r.voting_end) : ''}
    </p>
  </section>` : ''}

  <section>
    <h2>Podsumowanie głosowania</h2>
    ${voteData && voteData.total > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Opcja</th>
          <th>Liczba głosów</th>
          <th>Udział</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="vote-za">Za</td>
          <td>${voteData.za}</td>
          <td>${percentOf(voteData.za)}</td>
        </tr>
        <tr>
          <td class="vote-przeciw">Przeciw</td>
          <td>${voteData.przeciw}</td>
          <td>${percentOf(voteData.przeciw)}</td>
        </tr>
        <tr>
          <td class="vote-wstrzymuje">Wstrzymuje się</td>
          <td>${voteData.wstrzymuje}</td>
          <td>${percentOf(voteData.wstrzymuje)}</td>
        </tr>
        <tr>
          <td class="vote-total">Łącznie</td>
          <td class="vote-total">${voteData.total}</td>
          <td>100%</td>
        </tr>
      </tbody>
    </table>` : '<p style="color:#94a3b8">Brak oddanych głosów.</p>'}
  </section>

  <section>
    <h2>Lista głosów mieszkańców</h2>
    ${voteDetails.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Lokal</th>
          <th>Imię i nazwisko</th>
          <th>Głos</th>
          <th>Data oddania głosu</th>
        </tr>
      </thead>
      <tbody>
        ${voteDetails
          .slice()
          .sort((a, b) => (a.apartment_number ?? '').localeCompare(b.apartment_number ?? '', 'pl'))
          .map(v => {
            const voteLabel = v.vote === 'za' ? '<span class="vote-za">Za</span>'
              : v.vote === 'przeciw' ? '<span class="vote-przeciw">Przeciw</span>'
              : '<span class="vote-wstrzymuje">Wstrzymuje się</span>'
            const votedAt = new Date(v.voted_at).toLocaleString('pl-PL')
            return `<tr>
              <td>${v.apartment_number ?? '—'}</td>
              <td>${v.full_name}</td>
              <td>${voteLabel}</td>
              <td>${votedAt}</td>
            </tr>`
          }).join('')}
      </tbody>
    </table>` : '<p style="color:#94a3b8">Brak oddanych głosów.</p>'}
  </section>

  <div class="footer">WM Gabi &bull; wmgabi.pl &bull; Dokument wygenerowany automatycznie</div>
</body>
</html>`

    const win = window.open('', '_blank', 'width=800,height=600')
    if (!win) {
      toast('Zablokowano otwarcie okna — zezwól na pop-upy dla tej strony', 'error')
      return
    }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 400)
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
                maxLength={500}
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
                maxLength={5000}
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
                    {(r.status === 'voting' || r.status === 'closed') && (
                      <button
                        onClick={() => exportVotingPdf(r)}
                        className="p-2 text-outline hover:text-sage transition-colors"
                        title="Eksportuj wyniki głosowania (PDF)"
                      >
                        <DownloadIcon className="w-4 h-4" />
                      </button>
                    )}
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
