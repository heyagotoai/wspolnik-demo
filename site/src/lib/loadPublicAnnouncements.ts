import { supabase } from './supabase'
import { dedupeVotingAnnouncementsByResolution } from './votingAnnouncement'
import type { ResolutionSnapshotForAnnouncement } from './votingAnnouncement'

export interface PublicAnnouncementRow {
  id: string
  title: string
  content: string
  excerpt: string | null
  is_pinned: boolean
  created_at: string
}

export async function loadPublicAnnouncementsForDisplay(): Promise<{
  announcements: PublicAnnouncementRow[]
  resolutions: ResolutionSnapshotForAnnouncement[]
}> {
  const [{ data }, { data: resData }] = await Promise.all([
    supabase
      .from('announcements')
      .select('id, title, content, excerpt, is_pinned, created_at')
      .eq('is_public', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('resolutions').select('id, title, status, voting_start, voting_end'),
  ])
  const resList = (resData ?? []) as ResolutionSnapshotForAnnouncement[]
  const raw = (data ?? []) as PublicAnnouncementRow[]
  const deduped = dedupeVotingAnnouncementsByResolution(raw, resList)
  return { announcements: deduped, resolutions: resList }
}

const MAX_PREVIEW = 280

export function announcementPreview(a: PublicAnnouncementRow): string {
  const ex = a.excerpt?.trim()
  if (ex) return ex
  const c = a.content.trim().replace(/\s+/g, ' ')
  if (c.length <= MAX_PREVIEW) return c
  return `${c.slice(0, MAX_PREVIEW)}…`
}
