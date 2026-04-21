import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { api } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { PlusIcon, EditIcon, TrashIcon, XIcon, DownloadIcon, SendIcon } from '../../components/ui/Icons'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { useRole } from '../../hooks/useRole'
import { formatCaughtError } from '../../lib/userFacingErrors'
import {
  hasWeightedVoteShares,
  pctDisplayPrzeciw,
  pctDisplayWstrzymuje,
  pctDisplayZa,
} from '../../lib/voteResultsDisplay'

/** Escape HTML special characters to prevent XSS in generated HTML strings */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface Resolution {
  id: string
  title: string
  description: string | null
  document_id: string | null
  voting_start: string | null
  voting_end: string | null
  status: string
  created_at: string
  is_test?: boolean
  reminder_sent_at?: string | null
}

interface RemindResponse {
  detail: string
  recipients: string[]
  sent: number
  failed: number
  dry_run: boolean
}

interface VoteResults {
  za: number
  przeciw: number
  wstrzymuje: number
  total: number
  share_za: number
  share_przeciw: number
  share_wstrzymuje: number
  total_share_community: number
}

interface VoteDetail {
  resident_id: string
  full_name: string
  apartment_number: string | null
  apartments_count: number
  share: number
  vote: string
  voted_at: string
}

interface ResidentOption {
  id: string
  full_name: string
  apartment_number: string | null
  is_active: boolean
}

interface ResolutionForm {
  title: string
  description: string
  voting_start: string
  voting_end: string
  status: string
  is_test: boolean
}

const emptyForm: ResolutionForm = {
  title: '',
  description: '',
  voting_start: '',
  voting_end: '',
  status: 'draft',
  is_test: false,
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
  const [meetingModal, setMeetingModal] = useState<Resolution | null>(null)
  const [meetingResidents, setMeetingResidents] = useState<ResidentOption[]>([])
  const [meetingApartments, setMeetingApartments] = useState<Record<string, string[]>>({})
  const [meetingVoteRows, setMeetingVoteRows] = useState<VoteDetail[]>([])
  const [meetingLoading, setMeetingLoading] = useState(false)
  const [meetingResidentId, setMeetingResidentId] = useState('')
  const { confirm } = useConfirm()
  const { toast } = useToast()
  const { isAdmin } = useRole()
  const location = useLocation()

  const fetchResolutions = async () => {
    try {
      const data = await api.get<Resolution[]>('/resolutions')
      setResolutions(data)

      // Fetch results for voting/closed resolutions
      const resultsMap: Record<string, VoteResults> = {}
      for (const r of data) {
        if (r.status === 'voting' || r.status === 'closed' || r.status === 'draft') {
          try {
            resultsMap[r.id] = await api.get<VoteResults>(`/resolutions/${r.id}/results`)
          } catch { /* ignore */ }
        }
      }
      setResults(resultsMap)
    } catch {
      toast('Błąd ładowania uchwał', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResolutions()
  }, [])

  useEffect(() => {
    if (loading) return
    const raw = location.hash.replace(/^#/, '')
    if (!raw.startsWith('resolution-')) return
    const id = raw.slice('resolution-'.length)
    if (!id) return
    requestAnimationFrame(() => {
      document.getElementById(`resolution-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [loading, location.hash, resolutions])

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
      is_test: !!r.is_test,
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
    if (!form.voting_start.trim() || !form.voting_end.trim()) {
      setError('Początek i koniec głosowania są wymagane.')
      return
    }
    if (form.voting_end < form.voting_start) {
      setError('Data końca głosowania musi być taka sama lub późniejsza niż początek.')
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

    const payload: Record<string, string | boolean | null> = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      voting_start: form.voting_start.trim(),
      voting_end: form.voting_end.trim(),
      status: form.status,
      is_test: form.is_test,
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
      setError(formatCaughtError(e, 'Wystąpił błąd'))
    } finally {
      setSaving(false)
    }
  }

  const handleResetVotes = async (r: Resolution) => {
    const voteCount = results[r.id]?.total ?? 0
    if (voteCount === 0) return

    // Pierwsze ostrzeżenie — wyjaśnienie co się stanie
    const step1 = await confirm({
      title: '⚠️ Resetowanie głosów',
      message: `Zamierzasz usunąć WSZYSTKIE głosy (${voteCount}) oddane w uchwale „${r.title}". Mieszkańcy będą musieli zagłosować ponownie. Tej operacji NIE MOŻNA cofnąć.`,
      confirmLabel: 'Rozumiem, kontynuuj',
      cancelLabel: 'Anuluj',
      danger: true,
    })
    if (!step1) return

    // Drugie ostrzeżenie — wymóg wpisania "USUŃ"
    const step2 = await confirm({
      title: '🛑 Ostateczne potwierdzenie',
      message: `Zamierzasz nieodwracalnie usunąć ${voteCount} głosów z uchwały „${r.title}".`,
      confirmLabel: `Usuń ${voteCount} głosów`,
      cancelLabel: 'Nie, zachowaj głosy',
      danger: true,
      requireText: 'USUŃ',
    })
    if (!step2) return

    try {
      await api.delete(`/resolutions/${r.id}/votes`)
      toast(`Usunięto ${voteCount} głosów`, 'success')
      await fetchResolutions()
    } catch {
      toast('Błąd resetowania głosów', 'error')
    }
  }

  const handleRemindDryRun = async (r: Resolution) => {
    try {
      const res = await api.post<RemindResponse>(
        `/resolutions/${r.id}/remind?dry_run=true`,
        {},
      )
      if (res.recipients.length === 0) {
        toast('Wszyscy uprawnieni już oddali głos — nikt nie dostanie przypomnienia', 'success')
        return
      }
      const list = res.recipients.join('\n')
      const ok = await confirm({
        title: `Przypomnienie trafi do ${res.recipients.length} osób`,
        message: `Adresy odbiorców:\n\n${list}\n\nKliknij „Wyślij teraz", aby rozesłać przypomnienie.`,
        confirmLabel: 'Wyślij teraz',
        cancelLabel: 'Anuluj',
      })
      if (!ok) return
      await handleRemindSend(r)
    } catch (e: unknown) {
      toast(formatCaughtError(e, 'Błąd sprawdzania odbiorców'), 'error')
    }
  }

  const handleRemindSend = async (r: Resolution) => {
    try {
      const res = await api.post<RemindResponse>(
        `/resolutions/${r.id}/remind?dry_run=false`,
        {},
      )
      if (res.sent === 0 && res.failed === 0) {
        toast('Brak odbiorców — wszyscy już zagłosowali', 'success')
      } else if (res.failed > 0) {
        toast(`Wysłano ${res.sent}, nie udało się ${res.failed}`, 'error')
      } else {
        toast(`Wysłano przypomnienia do ${res.sent} osób`, 'success')
      }
      await fetchResolutions()
    } catch (e: unknown) {
      toast(formatCaughtError(e, 'Błąd wysyłki przypomnień'), 'error')
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

  const voteLabel = (v: string) =>
    v === 'za' ? 'Za' : v === 'przeciw' ? 'Przeciw' : 'Wstrzymuje się'

  const openMeetingVotesModal = async (r: Resolution) => {
    setMeetingModal(r)
    setMeetingResidentId('')
    setMeetingLoading(true)
    try {
      const [resList, votes, aptsRes] = await Promise.all([
        api.get<ResidentOption[]>('/residents'),
        api.get<VoteDetail[]>(`/resolutions/${r.id}/votes`),
        supabase
          .from('apartments')
          .select('number, owner_resident_id')
          .not('owner_resident_id', 'is', null),
      ])
      const aptMap: Record<string, string[]> = {}
      for (const a of aptsRes.data || []) {
        const oid = a.owner_resident_id as string | null
        if (!oid) continue
        aptMap[oid] = aptMap[oid] || []
        aptMap[oid].push(String(a.number))
      }
      for (const k of Object.keys(aptMap)) {
        aptMap[k].sort((x, y) => x.localeCompare(y, 'pl', { numeric: true }))
      }
      setMeetingResidents(resList)
      setMeetingVoteRows(votes)
      setMeetingApartments(aptMap)
    } catch {
      toast('Nie udało się załadować listy mieszkańców lub głosów', 'error')
      setMeetingModal(null)
    } finally {
      setMeetingLoading(false)
    }
  }

  const closeMeetingModal = () => {
    setMeetingModal(null)
    setMeetingResidents([])
    setMeetingApartments({})
    setMeetingVoteRows([])
    setMeetingResidentId('')
  }

  const submitMeetingVote = async (vote: 'za' | 'przeciw' | 'wstrzymuje') => {
    if (!meetingModal) return
    if (!meetingResidentId) {
      toast('Wybierz mieszkańca z listy', 'error')
      return
    }
    try {
      await api.post(`/resolutions/${meetingModal.id}/votes/register`, {
        resident_id: meetingResidentId,
        vote,
      })
      toast('Zapisano głos z zebrania', 'success')
      const votes = await api.get<VoteDetail[]>(`/resolutions/${meetingModal.id}/votes`)
      setMeetingVoteRows(votes)
      setMeetingResidentId('')
      await fetchResolutions()
    } catch (e: unknown) {
      toast(formatCaughtError(e, 'Nie udało się zapisać głosu'), 'error')
    }
  }

  const removeMeetingVote = async (residentId: string) => {
    if (!meetingModal) return
    const ok = await confirm({
      title: 'Usunąć głos?',
      message:
        'Usunięcie pozwala poprawić wpis przed otwarciem głosowania online. Tej operacji nie wykonuje się po publikacji uchwały.',
      confirmLabel: 'Usuń głos',
      danger: true,
    })
    if (!ok) return
    try {
      await api.delete(`/resolutions/${meetingModal.id}/votes/${residentId}`)
      toast('Głos usunięty', 'success')
      const votes = await api.get<VoteDetail[]>(`/resolutions/${meetingModal.id}/votes`)
      setMeetingVoteRows(votes)
      await fetchResolutions()
    } catch (e: unknown) {
      toast(formatCaughtError(e, 'Nie udało się usunąć głosu'), 'error')
    }
  }

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

    const weighted =
      voteData && voteData.total > 0 && hasWeightedVoteShares(voteData)
    const pctCol = (shareSum: number, headCount: number) => {
      if (!voteData || voteData.total <= 0) return '—'
      if (weighted) {
        return (
          ((shareSum / voteData.total_share_community) * 100).toFixed(1).replace('.', ',') + '%'
        )
      }
      return ((headCount / voteData.total) * 100).toFixed(1).replace('.', ',') + '%'
    }
    const participationShare = voteData
      ? voteData.share_za + voteData.share_przeciw + voteData.share_wstrzymuje
      : 0
    const pctParticipation = () => {
      if (!voteData || voteData.total <= 0) return '—'
      if (weighted) {
        return (
          ((participationShare / voteData.total_share_community) * 100).toFixed(1).replace('.', ',') + '%'
        )
      }
      return '100,0%'
    }
    const pctColumnTitle = weighted
      ? '% udziałów (wg ogółu lokali)'
      : '% (wg liczby głosów — brak udziałów u głosujących)'

    const html = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Wyniki głosowania — ${escapeHtml(r.title)}</title>
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
  <h1>${escapeHtml(r.title)}</h1>
  <p class="subtitle">Wygenerowano: ${generated}</p>

  ${r.description ? `<section>
    <h2>Opis uchwały</h2>
    <p>${escapeHtml(r.description).replace(/\n/g, '<br>')}</p>
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
          <th>${pctColumnTitle}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="vote-za">Za</td>
          <td>${voteData.za}</td>
          <td>${pctCol(voteData.share_za, voteData.za)}</td>
        </tr>
        <tr>
          <td class="vote-przeciw">Przeciw</td>
          <td>${voteData.przeciw}</td>
          <td>${pctCol(voteData.share_przeciw, voteData.przeciw)}</td>
        </tr>
        <tr>
          <td class="vote-wstrzymuje">Wstrzymuje się</td>
          <td>${voteData.wstrzymuje}</td>
          <td>${pctCol(voteData.share_wstrzymuje, voteData.wstrzymuje)}</td>
        </tr>
        <tr>
          <td class="vote-total">Łącznie (frekwencja)</td>
          <td class="vote-total">${voteData.total}</td>
          <td>${weighted ? pctParticipation() : '100,0% (wszyscy głosujący w podziale)'}</td>
        </tr>
      </tbody>
    </table>
    <p style="font-size:11px;color:#64748b;margin-top:8px">${weighted ? 'Kolumna procentowa: suma udziałów lokali (apartments.share) przypisanych do głosujących względem sumy udziałów wszystkich lokali. Brak udziału przy lokalu = waga głosu 0.' : 'Głosujący nie mają przypisanych udziałów jako właściciele lokali — procenty jak udział w liczbie oddanych głosów.'}</p>` : '<p style="color:#94a3b8">Brak oddanych głosów.</p>'}
  </section>

  <section>
    <h2>Lista głosów mieszkańców</h2>
    ${voteDetails.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Lokal(e)</th>
          <th>Imię i nazwisko</th>
          <th>Udział</th>
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
            const count = v.apartments_count || 0
            const aptCell = count > 1
              ? `${escapeHtml(v.apartment_number ?? '—')} (${count} lokale)`
              : escapeHtml(v.apartment_number ?? '—')
            const sharePct = v.share > 0 ? `${(v.share * 100).toFixed(2)}%` : '—'
            return `<tr>
              <td>${aptCell}</td>
              <td>${escapeHtml(v.full_name)}</td>
              <td>${sharePct}</td>
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
        {isAdmin && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Dodaj uchwałę
          </button>
        )}
      </div>

      {/* Form — admin only */}
      {isAdmin && showForm && (
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
                <label className="block text-sm font-medium text-charcoal mb-1">Początek głosowania *</label>
                <input
                  type="date"
                  required
                  value={form.voting_start}
                  onChange={(e) => setForm({ ...form, voting_start: e.target.value })}
                  className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Koniec głosowania *</label>
                <input
                  type="date"
                  required
                  value={form.voting_end}
                  onChange={(e) => setForm({ ...form, voting_end: e.target.value })}
                  className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
                />
              </div>
            </div>
            <p className="text-xs text-outline">
              Daty dotyczą całych dni (kalendarz). Aby przedłużyć głosowanie, ustaw późniejszy koniec przy statusie „Głosowanie otwarte”.
            </p>
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
            <div className="pt-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_test}
                  onChange={(e) => setForm({ ...form, is_test: e.target.checked })}
                  className="mt-0.5 w-4 h-4 accent-sage"
                />
                <span className="text-sm">
                  <span className="font-medium text-charcoal">Uchwała testowa</span>
                  <span className="block text-xs text-outline">
                    Mieszkańcy nie zobaczą tej uchwały w panelu ani nie dostaną ogłoszenia.
                    Cron przypomnień ją pomija — przypomnienie można wysłać ręcznie z listy.
                  </span>
                </span>
              </label>
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
            const adminPctSuf =
              voteData && voteData.total > 0 && hasWeightedVoteShares(voteData)
                ? 'udz.'
                : 'głos.'

            return (
              <div
                key={r.id}
                id={`resolution-${r.id}`}
                className="bg-white rounded-[var(--radius-card)] shadow-ambient p-5 scroll-mt-24"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                      {r.is_test && (
                        <span
                          className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800"
                          title="Uchwała testowa — niewidoczna dla mieszkańców, pomijana przez cron przypomnień"
                        >
                          TEST
                        </span>
                      )}
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
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs">
                        <span className="text-sage font-medium">
                          Za: {voteData.za}
                          {pctDisplayZa(voteData) != null &&
                            ` (${pctDisplayZa(voteData)}% ${adminPctSuf})`}
                        </span>
                        <span className="text-error font-medium">
                          Przeciw: {voteData.przeciw}
                          {pctDisplayPrzeciw(voteData) != null &&
                            ` (${pctDisplayPrzeciw(voteData)}% ${adminPctSuf})`}
                        </span>
                        <span className="text-slate font-medium">
                          Wstrzymuje: {voteData.wstrzymuje}
                          {pctDisplayWstrzymuje(voteData) != null &&
                            ` (${pctDisplayWstrzymuje(voteData)}% ${adminPctSuf})`}
                        </span>
                        <span className="text-outline">Razem głosów: {voteData.total}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1 shrink-0 justify-end">
                    {isAdmin && r.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => openMeetingVotesModal(r)}
                        className="px-2 py-1.5 text-xs font-medium text-sage border border-sage/40 rounded-[var(--radius-input)] hover:bg-sage-pale/40 transition-colors"
                        title="Zarejestruj głosy oddane osobiście na zebraniu — przed uruchomieniem głosowania online"
                      >
                        Głosy z zebrania
                      </button>
                    )}
                    {isAdmin && r.status === 'voting' && (
                      <button
                        type="button"
                        onClick={() => handleRemindDryRun(r)}
                        className="p-2 text-outline hover:text-sage transition-colors"
                        title={
                          r.reminder_sent_at
                            ? `Przypomnienie wysłane: ${new Date(r.reminder_sent_at).toLocaleString('pl-PL')}. Kliknij, aby wysłać ponownie.`
                            : 'Wyślij przypomnienie mieszkańcom, którzy nie oddali głosu'
                        }
                      >
                        <SendIcon className="w-4 h-4" />
                      </button>
                    )}
                    {isAdmin && voteData && voteData.total > 0 && (
                      <button
                        onClick={() => handleResetVotes(r)}
                        className="p-2 text-outline hover:text-error transition-colors"
                        title="Resetuj głosy (usuń wszystkie oddane głosy)"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    )}
                    {(r.status === 'voting' ||
                      r.status === 'closed' ||
                      (r.status === 'draft' && voteData && voteData.total > 0)) && (
                      <button
                        onClick={() => exportVotingPdf(r)}
                        className="p-2 text-outline hover:text-sage transition-colors"
                        title="Eksportuj wyniki głosowania (PDF)"
                      >
                        <DownloadIcon className="w-4 h-4" />
                      </button>
                    )}
                    {isAdmin && (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {meetingModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-charcoal/40"
              onClick={closeMeetingModal}
              aria-hidden
            />
            <div
              role="dialog"
              aria-modal
              aria-labelledby="meeting-votes-title"
              className="relative bg-white rounded-[var(--radius-card)] shadow-lg w-full max-w-3xl max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-cream-deep shrink-0">
                <h2 id="meeting-votes-title" className="text-lg font-semibold text-charcoal pr-2">
                  Głosy z zebrania
                </h2>
                <button
                  type="button"
                  onClick={closeMeetingModal}
                  className="text-outline hover:text-charcoal shrink-0"
                  aria-label="Zamknij"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-5 py-4 space-y-4 text-sm">
                <p className="text-slate leading-relaxed">
                  Zapisz tutaj głosy oddane <strong className="text-charcoal">osobiście na zebraniu</strong>, zanim
                  zmienisz status uchwały na „Głosowanie otwarte”. Mieszkaniec z już zarejestrowanym głosem nie
                  odda drugiego głosu w panelu — system traktuje oba tryby tak samo.
                </p>
                <p className="text-xs text-outline">
                  Uwaga: cofnięcie uchwały do szkicu z etapu głosowania usuwa wszystkie głosy (także z zebrania).
                </p>

                {meetingLoading ? (
                  <p className="text-slate py-6 text-center">Ładowanie...</p>
                ) : (
                  <>
                    {meetingVoteRows.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-outline uppercase tracking-wide mb-2">
                          Zarejestrowane głosy
                        </h3>
                        <ul className="divide-y divide-cream-deep border border-cream-deep rounded-[var(--radius-input)]">
                          {meetingVoteRows
                            .slice()
                            .sort((a, b) =>
                              (a.apartment_number ?? '').localeCompare(
                                b.apartment_number ?? '',
                                'pl',
                              ),
                            )
                            .map(row => (
                              <li
                                key={row.resident_id}
                                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                              >
                                <span className="min-w-0">
                                  <span className="font-medium text-charcoal block truncate">
                                    {row.full_name}
                                  </span>
                                  <span className="text-xs text-outline">
                                    {(row.apartments_count ?? 0) > 1
                                      ? `lokale ${row.apartment_number ?? '—'} (${row.apartments_count})`
                                      : `lokal ${row.apartment_number ?? '—'}`}
                                    {row.share > 0 && ` · udział ${(row.share * 100).toFixed(2)}%`}
                                    {' · '}{voteLabel(row.vote)}
                                  </span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeMeetingVote(row.resident_id)}
                                  className="text-xs text-error hover:underline shrink-0"
                                >
                                  Usuń
                                </button>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <h3 className="text-xs font-semibold text-outline uppercase tracking-wide mb-2">
                        Dodaj głos
                      </h3>
                      <label className="block text-xs font-medium text-charcoal mb-1">Mieszkaniec</label>
                      <select
                        value={meetingResidentId}
                        onChange={e => setMeetingResidentId(e.target.value)}
                        className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage mb-3"
                      >
                        <option value="">— wybierz —</option>
                        {meetingResidents
                          .filter(
                            r =>
                              r.is_active &&
                              !meetingVoteRows.some(v => v.resident_id === r.id),
                          )
                          .slice()
                          .sort((a, b) => a.full_name.localeCompare(b.full_name, 'pl'))
                          .map(r => {
                            const owned = meetingApartments[r.id] || []
                            const aptLabel = owned.length > 1
                              ? ` · lokale ${owned.join(', ')}`
                              : owned.length === 1
                                ? ` · lokal ${owned[0]}`
                                : r.apartment_number
                                  ? ` · lokal ${r.apartment_number}`
                                  : ''
                            return (
                            <option key={r.id} value={r.id}>
                              {r.full_name}
                              {aptLabel}
                            </option>
                            )
                          })}
                      </select>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => submitMeetingVote('za')}
                          className="px-3 py-1.5 text-sm font-medium rounded-[var(--radius-button)] bg-sage text-white hover:bg-sage-light"
                        >
                          Za
                        </button>
                        <button
                          type="button"
                          onClick={() => submitMeetingVote('przeciw')}
                          className="px-3 py-1.5 text-sm font-medium rounded-[var(--radius-button)] bg-error-container text-error hover:opacity-90"
                        >
                          Przeciw
                        </button>
                        <button
                          type="button"
                          onClick={() => submitMeetingVote('wstrzymuje')}
                          className="px-3 py-1.5 text-sm font-medium rounded-[var(--radius-button)] border border-cream-deep text-slate hover:bg-cream-deep/50"
                        >
                          Wstrzymuje się
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
