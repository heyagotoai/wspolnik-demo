import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createDemoSupabaseClient } from '../demo/demoSupabase'
import { isDemoApp } from '../demo/isDemoApp'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let realClient: SupabaseClient | null = null
let demoClient: ReturnType<typeof createDemoSupabaseClient> | null = null

function createRealClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Brak zmiennych środowiskowych VITE_SUPABASE_URL lub VITE_SUPABASE_ANON_KEY')
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Klient Supabase (produkcja) lub mock (tryb demo). W demo nie wymaga sekretów.
 * Gdy `isDemoApp()` — zawsze mock (w tym domyślna izolacja wspolnik-demo bez `VITE_DEMO_ALLOW_REAL_BACKEND`).
 */
export function getSupabase(): SupabaseClient {
  if (isDemoApp()) {
    if (!demoClient) demoClient = createDemoSupabaseClient()
    return demoClient as unknown as SupabaseClient
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Brak zmiennych środowiskowych VITE_SUPABASE_URL lub VITE_SUPABASE_ANON_KEY')
  }
  if (!realClient) realClient = createRealClient()
  return realClient
}

/** @deprecated Prefer getSupabase() — w trybie demo zwraca mock. */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase()
    const v = Reflect.get(client as object, prop)
    return typeof v === 'function' ? v.bind(client) : v
  },
})
