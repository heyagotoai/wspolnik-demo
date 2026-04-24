import { describe, expect, it } from 'vitest'
import { announcementPreview } from './loadPublicAnnouncements'

describe('announcementPreview', () => {
  it('prefers excerpt when set', () => {
    expect(
      announcementPreview({
        id: '1',
        title: 'T',
        content: 'x'.repeat(400),
        excerpt: 'Krótki skrót',
        is_pinned: false,
        created_at: new Date().toISOString(),
      }),
    ).toBe('Krótki skrót')
  })

  it('truncates long content when no excerpt', () => {
    const long = 'a'.repeat(400)
    const out = announcementPreview({
      id: '1',
      title: 'T',
      content: long,
      excerpt: null,
      is_pinned: false,
      created_at: new Date().toISOString(),
    })
    expect(out.endsWith('…')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(281)
  })
})
