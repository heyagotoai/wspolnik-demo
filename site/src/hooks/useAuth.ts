import { useEffect, useState, useCallback, useRef, createContext, useContext } from 'react'
import { useLocation } from 'react-router-dom'
import type { User, Session } from '@supabase/supabase-js'
import { getSupabase } from '../lib/supabase'
import { hasSupabaseCredentials } from '../demo/isDemoApp'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

function useDemoPathFlag(): boolean {
  const { pathname } = useLocation()
  return (
    import.meta.env.VITE_DEMO_ONLY === 'true' ||
    import.meta.env.VITE_PUBLIC_DEMO_ROUTES === 'true' ||
    !hasSupabaseCredentials() ||
    pathname.startsWith('/demo')
  )
}

export function useAuthProvider(): AuthState {
  const isDemoPath = useDemoPathFlag()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const signingOut = useRef(false)

  useEffect(() => {
    /** Bez .env i poza /demo — nie wołaj Supabase (w DEV getSupabase() i tak zwraca mock, ale bez fałszywej „sesji”). */
    if (!isDemoPath && !hasSupabaseCredentials()) {
      setSession(null)
      setUser(null)
      setLoading(false)
      return
    }

    const sb = getSupabase()

    if (isDemoPath) {
      void sb.auth.getSession().then(({ data: { session: s } }) => {
        setSession(s)
        setUser(s?.user ?? null)
        setLoading(false)
      })
      const { data: { subscription } } = sb.auth.onAuthStateChange((_event, s) => {
        setSession(s)
        setUser(s?.user ?? null)
      })
      return () => subscription.unsubscribe()
    }

    sb.auth.getSession().then(({ data: { session }, error }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (error) {
        sessionStorage.setItem('session_expired', '1')
      }
    })

    const { data: { subscription } } = sb.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (event === 'SIGNED_OUT' && !signingOut.current) {
          sessionStorage.setItem('session_expired', '1')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [isDemoPath])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isDemoPath && !hasSupabaseCredentials()) {
      return {
        error: new Error(
          'Brak konfiguracji Supabase — skopiuj site/.env.example do site/.env i uzupełnij VITE_SUPABASE_URL oraz VITE_SUPABASE_ANON_KEY.',
        ),
      }
    }
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }, [isDemoPath])

  const signOut = useCallback(async () => {
    if (!isDemoPath && !hasSupabaseCredentials()) {
      window.location.href = '/'
      return
    }
    signingOut.current = true
    await getSupabase().auth.signOut()
    if (isDemoPath) {
      window.location.href = '/'
      return
    }
    window.location.href = '/'
  }, [isDemoPath])

  return { user, session, loading, signIn, signOut }
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth musi być używany wewnątrz AuthProvider')
  }
  return context
}
