import { describe, it, expect } from 'vitest'
import { isWithinVotingPeriod, votingPeriodPhase } from './resolutionVotingWindow'

describe('resolutionVotingWindow', () => {
  it('isWithinVotingPeriod — granice inkluzywne (YYYY-MM-DD)', () => {
    expect(isWithinVotingPeriod('2026-04-01', '2026-04-15', '2026-04-01')).toBe(true)
    expect(isWithinVotingPeriod('2026-04-01', '2026-04-15', '2026-04-15')).toBe(true)
    expect(isWithinVotingPeriod('2026-04-01', '2026-04-15', '2026-03-31')).toBe(false)
    expect(isWithinVotingPeriod('2026-04-01', '2026-04-15', '2026-04-16')).toBe(false)
  })

  it('votingPeriodPhase — po voting_end', () => {
    expect(votingPeriodPhase('voting', '2026-03-26', '2026-03-31', '2026-04-04')).toBe('ended')
  })

  it('votingPhase — przed voting_start', () => {
    expect(votingPeriodPhase('voting', '2026-04-10', '2026-04-20', '2026-04-05')).toBe('upcoming')
  })
})
