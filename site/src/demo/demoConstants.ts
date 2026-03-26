/**
 * Izolacja danych: dopóki `VITE_DEMO_ALLOW_REAL_BACKEND !== 'true'`, `isDemoApp()` jest true
 * — żadne żądania nie idą do prawdziwego Supabase/API (patrz `isDemoApp.ts`, `getSupabase`).
 */

/** Syntetyczny użytkownik demo — spójny z seedem w demoStore */
export const DEMO_USER_ID = 'a1000000-0000-4000-8000-000000000001'
export const DEMO_USER_EMAIL = 'demo.mieszkaniec@wspolnik-demo.local'

export const DEMO_ROLE_STORAGE_KEY = 'wspolnik_demo_role'
