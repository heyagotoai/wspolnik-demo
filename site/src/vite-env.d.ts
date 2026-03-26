/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_API_URL?: string
  /** Cała aplikacja w trybie demo (mocki), bez prefiksu /demo w URL */
  readonly VITE_DEMO_ONLY?: string
  /** Pełny mock (API + Supabase + kontakt) — np. deploy wspolnik-demo bez sieci do produkcji */
  readonly VITE_PUBLIC_DEMO_ROUTES?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
