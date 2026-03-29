/** Tytuł auto-ogłoszenia z api/routes/resolutions.py: `Nowe głosowanie: {tytuł uchwały}` */
export const VOTING_ANNOUNCEMENT_PREFIX = 'Nowe głosowanie:'

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
