import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { formatCaughtError } from '../../lib/userFacingErrors'
import { votingPeriodPhase } from '../../lib/resolutionVotingWindow'
import {
  barWidthPrzeciwPct,
  barWidthWstrzymujePct,
  barWidthZaPct,
  hasWeightedVoteShares,
  pctDisplayParticipation,
  pctDisplayPrzeciw,
  pctDisplayWstrzymuje,
  pctDisplayZa,
} from '../../lib/voteResultsDisplay'
import { DemoHelpCallout } from '../../demo/DemoHelpCallout'

interface Resolution {
  id: string
  title: string
  description: string | null
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
  share_za: number
  share_przeciw: number
  share_wstrzymuje: number
  total_share_community: number
}

interface MyVote {
  id: string
  vote: string
  voted_at: string
}

/** Fragment profilu z GET /profile — uprawnienie do głosu (admin/zarządca tylko jako właściciel lokalu) */
interface ProfileVoteFields {
  role: string
  can_vote_resolutions: boolean
}

const phaseLabels: Record<
  'voting' | 'closed' | 'upcoming' | 'ended' | 'draft',
  { label: string; bg: string; text: string }
> = {
  draft: { label: 'Szkic', bg: 'bg-cream-deep', text: 'text-slate' },
  voting: { label: 'Głosowanie otwarte', bg: 'bg-sage-pale/40', text: 'text-sage' },
  upcoming: { label: 'Głosowanie zaplanowane', bg: 'bg-cream-deep', text: 'text-slate' },
  ended: { label: 'Okres głosowania zakończony', bg: 'bg-cream-deep', text: 'text-slate' },
  closed: { label: 'Zamknięta', bg: 'bg-error-container', text: 'text-error' },
}

const voteOptions = [
  { value: 'za', label: 'Za', color: 'bg-sage text-white hover:bg-sage-light' },
  { value: 'przeciw', label: 'Przeciw', color: 'bg-error text-white hover:bg-error/80' },
  { value: 'wstrzymuje', label: 'Wstrzymuję się', color: 'bg-slate text-white hover:bg-slate/80' },
] as const

export default function ResidentResolutionsPage() {
  const location = useLocation()
  const [resolutions, setResolutions] = useState<Resolution[]>([])
  const [results, setResults] = useState<Record<string, VoteResults>>({})
  const [myVotes, setMyVotes] = useState<Record<string, MyVote>>({})
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState<string | null>(null)
  const [voteEligibility, setVoteEligibility] = useState<ProfileVoteFields | null>(null)
  const { toast } = useToast()

  const fetchData = async () => {
    try {
      const [data, profile] = await Promise.all([
        api.get<Resolution[]>('/resolutions'),
        api.get<ProfileVoteFields>('/profile'),
      ])
      setVoteEligibility({
        role: profile.role,
        can_vote_resolutions: profile.can_vote_resolutions,
      })
      // Show only voting and closed resolutions to residents
      const visible = data.filter((r) => r.status === 'voting' || r.status === 'closed')
      setResolutions(visible)

      const resultsMap: Record<string, VoteResults> = {}
      const votesMap: Record<string, MyVote> = {}

      for (const r of visible) {
        try {
          resultsMap[r.id] = await api.get<VoteResults>(`/resolutions/${r.id}/results`)
        } catch { /* ignore */ }

        try {
          const myVote = await api.get<MyVote | null>(`/resolutions/${r.id}/my-vote`)
          if (myVote) votesMap[r.id] = myVote
        } catch { /* ignore */ }
      }

      setResults(resultsMap)
      setMyVotes(votesMap)
    } catch {
      toast('Błąd ładowania uchwał', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
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

  const handleVote = async (resolutionId: string, vote: string) => {
    setVoting(resolutionId)
    try {
      const result = await api.post<MyVote>(`/resolutions/${resolutionId}/vote`, { vote })
      setMyVotes((prev) => ({ ...prev, [resolutionId]: result }))

      // Refresh results
      const updatedResults = await api.get<VoteResults>(`/resolutions/${resolutionId}/results`)
      setResults((prev) => ({ ...prev, [resolutionId]: updatedResults }))

      toast('Głos został oddany', 'success')
    } catch (e: unknown) {
      toast(formatCaughtError(e, 'Błąd głosowania'), 'error')
    } finally {
      setVoting(null)
    }
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  const getVoteLabel = (vote: string) => {
    const option = voteOptions.find((o) => o.value === vote)
    return option?.label || vote
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate">Ładowanie...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-charcoal">Głosowania</h1>

      <DemoHelpCallout>
        Gdy uchwała jest w głosowaniu, możesz wybrać za / przeciw / wstrzymuję się (jeśli masz uprawnienia właściciela).
        Po zamknięciu terminu widać wyniki — w demo wszystko działa na przykładowych liczbach.
      </DemoHelpCallout>

      <p className="text-sm text-slate leading-relaxed">
        Przed oddaniem głosu prosimy o uważne zapoznanie się z treścią uchwały.
        Głos jest ostateczny — po jego oddaniu nie ma możliwości zmiany.
      </p>

      {resolutions.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
          <p className="text-slate">Brak aktywnych głosowań.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {resolutions.map((r) => {
            const phase = votingPeriodPhase(r.status, r.voting_start, r.voting_end)
            const status = phaseLabels[phase]
            const voteData = results[r.id]
            const myVote = myVotes[r.id]
            const canVote =
              phase === 'voting' &&
              !myVote &&
              voteEligibility !== null &&
              voteEligibility.can_vote_resolutions
            const pctSuffix = voteData && hasWeightedVoteShares(voteData) ? 'udziałów' : 'głosów'
            const pZa = voteData ? pctDisplayZa(voteData) : null
            const pPrzeciw = voteData ? pctDisplayPrzeciw(voteData) : null
            const pWstrz = voteData ? pctDisplayWstrzymuje(voteData) : null
            const pFrek = voteData ? pctDisplayParticipation(voteData) : null

            return (
              <div
                key={r.id}
                id={`resolution-${r.id}`}
                className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6 scroll-mt-24"
              >
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.bg} ${status.text}`}>
                    {status.label}
                  </span>
                  {(r.voting_start || r.voting_end) && (
                    <span className="text-xs text-outline">
                      {r.voting_start && formatDate(r.voting_start)}
                      {r.voting_start && r.voting_end && ' — '}
                      {r.voting_end && formatDate(r.voting_end)}
                    </span>
                  )}
                </div>

                <h2 className="text-base font-semibold text-charcoal">{r.title}</h2>
                {r.description && (
                  <p className="text-sm text-slate mt-2 whitespace-pre-wrap">{r.description}</p>
                )}

                {/* Results */}
                {voteData && voteData.total > 0 && (
                  <div className="mt-4">
                    <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-cream-deep">
                      <>
                        {voteData.za > 0 && (
                          <div
                            className="bg-sage transition-all"
                            style={{ width: `${barWidthZaPct(voteData)}%` }}
                          />
                        )}
                        {voteData.przeciw > 0 && (
                          <div
                            className="bg-error transition-all"
                            style={{ width: `${barWidthPrzeciwPct(voteData)}%` }}
                          />
                        )}
                        {voteData.wstrzymuje > 0 && (
                          <div
                            className="bg-slate/40 transition-all"
                            style={{ width: `${barWidthWstrzymujePct(voteData)}%` }}
                          />
                        )}
                      </>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs">
                      <span className="text-sage font-medium">
                        Za: {voteData.za}
                        {pZa != null && ` (${pZa}% ${pctSuffix})`}
                      </span>
                      <span className="text-error font-medium">
                        Przeciw: {voteData.przeciw}
                        {pPrzeciw != null && ` (${pPrzeciw}% ${pctSuffix})`}
                      </span>
                      <span className="text-slate font-medium">
                        Wstrzymuje: {voteData.wstrzymuje}
                        {pWstrz != null && ` (${pWstrz}% ${pctSuffix})`}
                      </span>
                      <span className="text-outline ml-auto">
                        Głosów: {voteData.total}
                        {pFrek != null && ` · frekwencja wg udziałów: ${pFrek}%`}
                      </span>
                    </div>
                    {voteData.total_share_community > 0 &&
                      !hasWeightedVoteShares(voteData) &&
                      voteData.total > 0 && (
                        <p className="text-xs text-outline mt-2">
                          U głosujących nie ma przypisanych udziałów w Lokale (właściciel) — wykres i procenty
                          liczone jak udział w liczbie oddanych głosów.
                        </p>
                      )}
                  </div>
                )}

                {/* My vote info */}
                {myVote && (
                  <div className="mt-4 p-3 bg-cream rounded-[var(--radius-input)] text-sm text-charcoal">
                    Twój głos: <strong>{getVoteLabel(myVote.vote)}</strong>
                    <span className="text-outline ml-2">({formatDate(myVote.voted_at)})</span>
                  </div>
                )}

                {voteEligibility &&
                  phase === 'voting' &&
                  !myVote &&
                  !voteEligibility.can_vote_resolutions && (
                    <p className="mt-4 text-sm text-slate bg-cream-deep/80 rounded-[var(--radius-input)] px-3 py-2">
                      {voteEligibility.role === 'admin' || voteEligibility.role === 'manager'
                        ? 'Jako administrator lub zarządca możesz głosować tylko wtedy, gdy jesteś przypisany jako właściciel lokalu w panelu Lokale. Po przypisaniu odśwież stronę — wtedy pojawią się przyciski głosowania.'
                        : 'Nie możesz oddać głosu (np. konto nieaktywne). W razie pytań skontaktuj się z administratorem.'}
                    </p>
                  )}

                {/* Voting buttons */}
                {canVote && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {voteOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleVote(r.id, option.value)}
                        disabled={voting === r.id}
                        className={`px-4 py-2 text-sm font-medium rounded-[var(--radius-button)] transition-colors disabled:opacity-50 ${option.color}`}
                      >
                        {voting === r.id ? 'Głosowanie...' : option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
