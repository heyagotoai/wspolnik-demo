import { useEffect, useState, useCallback, useRef, createContext, useContext } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuthProvider(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const signingOut = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (error) {
        sessionStorage.setItem('session_expired', '1')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (event === 'SIGNED_OUT' && !signingOut.current) {
          sessionStorage.setItem('session_expired', '1')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }, [])

  const signOut = useCallback(async () => {
    signingOut.current = true
    await supabase.auth.signOut()
    window.location.href = '/'
  }, [])

  return { user, session, loading, signIn, signOut }
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth musi być używany wewnątrz AuthProvider')
  }
  return context
}
