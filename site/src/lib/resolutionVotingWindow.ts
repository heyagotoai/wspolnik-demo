/** Okres głosowania — daty YYYY-MM-DD, porównanie wg kalendarza w Europe/Warsaw (jak backend). */

function parseResolutionDate(s: string | null | undefined): string | null {
  if (!s?.trim()) return null
  return s.trim().slice(0, 10)
}

/** Dzisiejsza data YYYY-MM-DD w kalendarzu Europe/Warsaw. */
export function localTodayPl(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function isWithinVotingPeriod(
  votingStart: string | null | undefined,
  votingEnd: string | null | undefined,
  todayIso?: string,
): boolean {
  const today = todayIso ?? localTodayPl()
  const start = parseResolutionDate(votingStart)
  const end = parseResolutionDate(votingEnd)
  if (!start || !end) return false
  if (today < start) return false
  if (today > end) return false
  return true
}

/** Dla badge: uchwała w statusie voting, ale poza okresem dat. */
export function votingPeriodPhase(
  status: string,
  votingStart: string | null | undefined,
  votingEnd: string | null | undefined,
  todayIso?: string,
): 'draft' | 'closed' | 'voting' | 'upcoming' | 'ended' {
  if (status === 'closed') return 'closed'
  if (status !== 'voting') return 'draft'
  const today = todayIso ?? localTodayPl()
  const start = parseResolutionDate(votingStart)
  const end = parseResolutionDate(votingEnd)
  if (!start || !end) return 'ended'
  if (today < start) return 'upcoming'
  if (today > end) return 'ended'
  return 'voting'
}
