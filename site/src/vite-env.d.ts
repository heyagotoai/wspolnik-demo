/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_API_URL?: string
  /** Cała aplikacja w trybie demo (mocki), bez prefiksu /demo w URL */
  readonly VITE_DEMO_ONLY?: string
  /** Pełny mock (API + Supabase + kontakt) — np. deploy wspolnik-demo bez sieci do produkcji */
  readonly VITE_PUBLIC_DEMO_ROUTES?: string
  /**
   * Tylko gdy `'true'`: możliwe połączenie z prawdziwym Supabase/API (testy Vitest, lokalna integracja).
   * Domyślnie (brak / inna wartość): **wyłącznie mocki** — nic nie trafia do bazy.
   */
  readonly VITE_DEMO_ALLOW_REAL_BACKEND?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
