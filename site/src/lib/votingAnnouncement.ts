import { votingPeriodPhase } from './resolutionVotingWindow'

/** Tytuł auto-ogłoszenia z api/routes/resolutions.py: `Nowe głosowanie: {tytuł uchwały}` */
export const VOTING_ANNOUNCEMENT_PREFIX = 'Nowe głosowanie:'

export interface ResolutionSnapshotForAnnouncement {
  id: string
  title: string
  status: string
  voting_start: string | null
  voting_end: string | null
}

export function resolutionTitleFromVotingAnnouncement(announcementTitle: string): string | null {
  const t = announcementTitle.trim()
  if (!t.startsWith(VOTING_ANNOUNCEMENT_PREFIX)) return null
  const rest = t.slice(VOTING_ANNOUNCEMENT_PREFIX.length).trim()
  return rest || null
}

export function findResolutionIdByTitle(
  resolutionTitle: string,
  resolutions: readonly { id: string; title: string }[],
): string | null {
  const needle = resolutionTitle.trim()
  const r = resolutions.find(x => x.title.trim() === needle)
  return r?.id ?? null
}

export function findResolutionForVotingAnnouncement(
  announcementTitle: string,
  resolutions: readonly ResolutionSnapshotForAnnouncement[],
): ResolutionSnapshotForAnnouncement | null {
  const rt = resolutionTitleFromVotingAnnouncement(announcementTitle)
  if (!rt) return null
  const id = findResolutionIdByTitle(rt, resolutions)
  if (!id) return null
  return resolutions.find((x) => x.id === id) ?? null
}

/** Starsze duplikaty auto-ogłoszeń o tej samej uchwale — zostaw najnowsze. */
export function dedupeVotingAnnouncementsByResolution<
  T extends { id: string; title: string; created_at: string },
>(announcements: T[], resolutions: readonly { id: string; title: string }[]): T[] {
  const groups = new Map<string, T[]>()
  for (const a of announcements) {
    const rt = resolutionTitleFromVotingAnnouncement(a.title)
    const rid = rt ? findResolutionIdByTitle(rt, resolutions) : null
    if (!rid) continue
    const g = groups.get(rid) ?? []
    g.push(a)
    groups.set(rid, g)
  }
  const drop = new Set<string>()
  for (const [, list] of groups) {
    if (list.length <= 1) continue
    list.sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime())
    for (let i = 1; i < list.length; i++) drop.add(list[i].id)
  }
  return announcements.filter((a) => !drop.has(a.id))
}

/**
 * Treść widoczna dla mieszkańców — zsynchronizowana z aktualnym stanem uchwały
 * (tekst w DB jest statyczny z dnia utworzenia ogłoszenia).
 */
export function buildVotingAnnouncementBody(
  resolution: ResolutionSnapshotForAnnouncement,
  formatDate: (iso: string) => string,
): string {
  const t = resolution.title
  if (resolution.status === 'closed') {
    return (
      `Głosowanie nad uchwałą „${t}” zostało zamknięte.\n\n` +
      `Szczegóły i wyniki znajdziesz w zakładce Głosowania.`
    )
  }

  const phase = votingPeriodPhase(
    resolution.status,
    resolution.voting_start,
    resolution.voting_end,
  )
  const vs = resolution.voting_start ? formatDate(resolution.voting_start) : '—'
  const ve = resolution.voting_end ? formatDate(resolution.voting_end) : '—'

  if (phase === 'upcoming') {
    return (
      `Głosowanie nad uchwałą „${t}” rozpocznie się ${vs} (koniec: ${ve}).\n\n` +
      `Po otwarciu głosowania oddasz głos w zakładce Głosowania.`
    )
  }
  if (phase === 'voting') {
    return (
      `Trwa głosowanie nad uchwałą „${t}” (termin do ${ve}).\n\n` +
      `Oddaj głos w zakładce Głosowania.`
    )
  }
  return (
    `Okres głosowania nad uchwałą „${t}” (planowo ${vs}–${ve}) dobiegł końca.\n\n` +
    `Wyniki znajdziesz w zakładce Głosowania.`
  )
}

