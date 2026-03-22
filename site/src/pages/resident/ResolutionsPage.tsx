import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'

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
}

interface MyVote {
  id: string
  vote: string
  voted_at: string
}

const statusLabels: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'Szkic', bg: 'bg-cream-deep', text: 'text-slate' },
  voting: { label: 'Głosowanie otwarte', bg: 'bg-sage-pale/40', text: 'text-sage' },
  closed: { label: 'Zamknięta', bg: 'bg-error-container', text: 'text-error' },
}

const voteOptions = [
  { value: 'za', label: 'Za', color: 'bg-sage text-white hover:bg-sage-light' },
  { value: 'przeciw', label: 'Przeciw', color: 'bg-error text-white hover:bg-error/80' },
  { value: 'wstrzymuje', label: 'Wstrzymuję się', color: 'bg-slate text-white hover:bg-slate/80' },
] as const

export default function ResidentResolutionsPage() {
  const [resolutions, setResolutions] = useState<Resolution[]>([])
  const [results, setResults] = useState<Record<string, VoteResults>>({})
  const [myVotes, setMyVotes] = useState<Record<string, MyVote>>({})
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchData = async () => {
    try {
      const data = await api.get<Resolution[]>('/resolutions')
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
      toast(e instanceof Error ? e.message : 'Błąd głosowania', 'error')
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

      {resolutions.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
          <p className="text-slate">Brak aktywnych głosowań.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {resolutions.map((r) => {
            const status = statusLabels[r.status] || statusLabels.draft
            const voteData = results[r.id]
            const myVote = myVotes[r.id]
            const canVote = r.status === 'voting' && !myVote

            return (
              <div key={r.id} className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
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
                      {voteData.za > 0 && (
                        <div
                          className="bg-sage transition-all"
                          style={{ width: `${(voteData.za / voteData.total) * 100}%` }}
                        />
                      )}
                      {voteData.przeciw > 0 && (
                        <div
                          className="bg-error transition-all"
                          style={{ width: `${(voteData.przeciw / voteData.total) * 100}%` }}
                        />
                      )}
                      {voteData.wstrzymuje > 0 && (
                        <div
                          className="bg-slate/40 transition-all"
                          style={{ width: `${(voteData.wstrzymuje / voteData.total) * 100}%` }}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span className="text-sage font-medium">Za: {voteData.za}</span>
                      <span className="text-error font-medium">Przeciw: {voteData.przeciw}</span>
                      <span className="text-slate font-medium">Wstrzymuje: {voteData.wstrzymuje}</span>
                      <span className="text-outline ml-auto">Łącznie: {voteData.total}</span>
                    </div>
                  </div>
                )}

                {/* My vote info */}
                {myVote && (
                  <div className="mt-4 p-3 bg-cream rounded-[var(--radius-input)] text-sm text-charcoal">
                    Twój głos: <strong>{getVoteLabel(myVote.vote)}</strong>
                    <span className="text-outline ml-2">({formatDate(myVote.voted_at)})</span>
                  </div>
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
