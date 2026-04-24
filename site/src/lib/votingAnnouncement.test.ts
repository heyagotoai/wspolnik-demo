import { describe, it, expect } from 'vitest'
import {
  VOTING_ANNOUNCEMENT_PREFIX,
  resolutionTitleFromVotingAnnouncement,
  findResolutionIdByTitle,
  dedupeVotingAnnouncementsByResolution,
  buildVotingAnnouncementBody,
} from './votingAnnouncement'

const fmt = (s: string) => s

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

  it('dedupe — zostawia najnowsze ogłoszenie per uchwała', () => {
    const resolutions = [{ id: 'r1', title: 'Uchwała A' }]
    const ann = [
      { id: 'a1', title: 'Nowe głosowanie: Uchwała A', created_at: '2026-03-01T10:00:00Z' },
      { id: 'a2', title: 'Nowe głosowanie: Uchwała A', created_at: '2026-03-15T10:00:00Z' },
    ]
    const out = dedupeVotingAnnouncementsByResolution(ann, resolutions)
    expect(out.map((x) => x.id)).toEqual(['a2'])
  })

  it('buildVotingAnnouncementBody — zamknięta', () => {
    const t = buildVotingAnnouncementBody(
      {
        id: 'r1',
        title: 'Test',
        status: 'closed',
        voting_start: '2026-04-01',
        voting_end: '2026-04-10',
      },
      fmt,
    )
    expect(t).toContain('zamknięte')
  })
})
