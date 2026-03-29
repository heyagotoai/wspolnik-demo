import { describe, it, expect } from 'vitest'
import {
  VOTING_ANNOUNCEMENT_PREFIX,
  resolutionTitleFromVotingAnnouncement,
  findResolutionIdByTitle,
} from './votingAnnouncement'

describe('votingAnnouncement', () => {
  it('wyciąga tytuł uchwały z auto-ogłoszenia', () => {
    expect(resolutionTitleFromVotingAnnouncement(`${VOTING_ANNOUNCEMENT_PREFIX} Uchwała 5`)).toBe('Uchwała 5')
  })

  it('dopasowuje id po tytule', () => {
    const id = findResolutionIdByTitle('Uchwała 5', [
      { id: 'x1', title: 'Inna' },
      { id: 'x2', title: 'Uchwała 5' },
    ])
    expect(id).toBe('x2')
  })

  it('null gdy brak dopasowania', () => {
    expect(findResolutionIdByTitle('Nie ma', [{ id: 'x', title: 'Coś' }])).toBeNull()
  })
})
