/**
 * Agregacja wyników głosowania: udziały (apartments.share) albo fallback na liczbę głosów,
 * gdy głosujący nie mają przypisanych wag (brak właściciela lokalu).
 */

export interface VoteResultsLike {
  za: number
  przeciw: number
  wstrzymuje: number
  total: number
  share_za: number
  share_przeciw: number
  share_wstrzymuje: number
  total_share_community: number
}

/** Są sensowne wagi udziałów dla oddanych głosów (nie wszystkie zera przy niezerowej masie wspólnoty). */
export function hasWeightedVoteShares(v: VoteResultsLike | undefined): boolean {
  if (!v || v.total_share_community <= 0) return false
  return v.share_za + v.share_przeciw + v.share_wstrzymuje > 0
}

export function barWidthZaPct(v: VoteResultsLike): number {
  if (v.total <= 0) return 0
  if (hasWeightedVoteShares(v)) {
    return (v.share_za / v.total_share_community) * 100
  }
  return (v.za / v.total) * 100
}

export function barWidthPrzeciwPct(v: VoteResultsLike): number {
  if (v.total <= 0) return 0
  if (hasWeightedVoteShares(v)) {
    return (v.share_przeciw / v.total_share_community) * 100
  }
  return (v.przeciw / v.total) * 100
}

export function barWidthWstrzymujePct(v: VoteResultsLike): number {
  if (v.total <= 0) return 0
  if (hasWeightedVoteShares(v)) {
    return (v.share_wstrzymuje / v.total_share_community) * 100
  }
  return (v.wstrzymuje / v.total) * 100
}

/** Procent w kolumnie „udziały” albo „głosy” (fallback). */
export function pctDisplayZa(v: VoteResultsLike): string | null {
  if (v.total <= 0) return null
  if (hasWeightedVoteShares(v)) {
    return ((v.share_za / v.total_share_community) * 100).toFixed(1).replace('.', ',')
  }
  return ((v.za / v.total) * 100).toFixed(1).replace('.', ',')
}

export function pctDisplayPrzeciw(v: VoteResultsLike): string | null {
  if (v.total <= 0) return null
  if (hasWeightedVoteShares(v)) {
    return ((v.share_przeciw / v.total_share_community) * 100).toFixed(1).replace('.', ',')
  }
  return ((v.przeciw / v.total) * 100).toFixed(1).replace('.', ',')
}

export function pctDisplayWstrzymuje(v: VoteResultsLike): string | null {
  if (v.total <= 0) return null
  if (hasWeightedVoteShares(v)) {
    return ((v.share_wstrzymuje / v.total_share_community) * 100).toFixed(1).replace('.', ',')
  }
  return ((v.wstrzymuje / v.total) * 100).toFixed(1).replace('.', ',')
}

export function pctDisplayParticipation(v: VoteResultsLike): string | null {
  if (v.total <= 0) return null
  if (hasWeightedVoteShares(v)) {
    const s = v.share_za + v.share_przeciw + v.share_wstrzymuje
    return ((s / v.total_share_community) * 100).toFixed(1).replace('.', ',')
  }
  return null
}
