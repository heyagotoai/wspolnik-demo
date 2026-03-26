/**
 * Tryb demo: mocki w pamięci, bez zapisu do Supabase/API.
 * Włączenie:
 * - VITE_DEMO_ONLY=true (cała aplikacja),
 * - VITE_PUBLIC_DEMO_ROUTES=true (repo wspolnik-demo: panel + API + kontakt — bez prawdziwej sieci),
 * - ścieżka /demo/*,
 * - brak VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (repo demo bez .env — wyłącznie mocki).
 */
export function hasSupabaseCredentials(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return Boolean(url && String(url).trim() && key && String(key).trim())
}

/** Tylko ścieżka URL + VITE_DEMO_ONLY (bez „brak .env” — patrz isDemoApp). */
export function isDemoAppFromPath(pathname: string): boolean {
  if (import.meta.env.VITE_DEMO_ONLY === 'true') return true
  return pathname.startsWith('/demo')
}

export function isDemoApp(): boolean {
  if (import.meta.env.VITE_DEMO_ONLY === 'true') return true
  if (import.meta.env.VITE_PUBLIC_DEMO_ROUTES === 'true') return true
  if (!hasSupabaseCredentials()) return true
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) return true
  return false
}

/** @deprecated Użyj isDemoApp() — alias dla czytelności (np. ContactPage). */
export function isContactFormDemo(): boolean {
  return isDemoApp()
}

/** Linki w PageLayout (/, /kontakt, …) z prefiksem /demo gdy `prefix` = `/demo`. */
export function withDemoPublicPath(prefix: string, path: string): string {
  if (!prefix) return path
  if (path === '/') return prefix
  return `${prefix}${path}`
}
