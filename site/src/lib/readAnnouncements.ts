const storageKey = (userId: string) => `wm_read_ann_${userId}`

export function getReadIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

export function markRead(userId: string, ids: string[]): void {
  const current = getReadIds(userId)
  ids.forEach((id) => current.add(id))
  localStorage.setItem(storageKey(userId), JSON.stringify([...current]))
}
