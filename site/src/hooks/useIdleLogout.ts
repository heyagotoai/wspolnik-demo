import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from './useAuth'
import { useToast } from '../components/ui/Toast'

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const

interface Options {
  /** Ile ms przed wylogowaniem pokazać ostrzeżenie z opcją przedłużenia. 0 = brak ostrzeżenia. */
  warnMs?: number
}

interface IdleState {
  warning: boolean
  remainingSec: number
  extend: () => void
}

/**
 * Wylogowuje po `timeoutMs` bezczynności. Timer leci niezależnie od widoczności karty —
 * karta zostawiona w tle wygaśnie tak samo jak aktywna. Sesja Supabase jest współdzielona
 * między kartami, więc `signOut()` wyloguje wszystkie otwarte karty jednocześnie.
 *
 * Gdy `warnMs > 0`, `warning` staje się `true` na `warnMs` ms przed końcem — w tym czasie
 * ruch myszą/klawiatura nie resetują już timera, wymagane jest jawne kliknięcie `extend()`.
 */
export function useIdleLogout(timeoutMs: number, options: Options = {}): IdleState {
  const warnMs = options.warnMs ?? 0
  const { user, signOut } = useAuth()
  const { toast } = useToast()

  const warnTimerRef = useRef<number | null>(null)
  const logoutTimerRef = useRef<number | null>(null)
  const countdownRef = useRef<number | null>(null)
  const warningRef = useRef(false)

  const [warning, setWarning] = useState(false)
  const [remainingSec, setRemainingSec] = useState(0)

  const clearAll = useCallback(() => {
    if (warnTimerRef.current !== null) window.clearTimeout(warnTimerRef.current)
    if (logoutTimerRef.current !== null) window.clearTimeout(logoutTimerRef.current)
    if (countdownRef.current !== null) window.clearInterval(countdownRef.current)
    warnTimerRef.current = null
    logoutTimerRef.current = null
    countdownRef.current = null
  }, [])

  const doLogout = useCallback(() => {
    clearAll()
    warningRef.current = false
    setWarning(false)
    toast('Wylogowano z powodu bezczynności', 'info')
    sessionStorage.setItem('session_expired', '1')
    void signOut()
  }, [clearAll, signOut, toast])

  const start = useCallback(() => {
    clearAll()
    warningRef.current = false
    setWarning(false)

    if (warnMs > 0 && warnMs < timeoutMs) {
      warnTimerRef.current = window.setTimeout(() => {
        warningRef.current = true
        setWarning(true)
        setRemainingSec(Math.ceil(warnMs / 1000))
        countdownRef.current = window.setInterval(() => {
          setRemainingSec((s) => (s > 1 ? s - 1 : 0))
        }, 1000)
        logoutTimerRef.current = window.setTimeout(doLogout, warnMs)
      }, timeoutMs - warnMs)
    } else {
      logoutTimerRef.current = window.setTimeout(doLogout, timeoutMs)
    }
  }, [clearAll, doLogout, timeoutMs, warnMs])

  const extend = useCallback(() => {
    start()
  }, [start])

  useEffect(() => {
    if (!user) return

    start()

    const onActivity = () => {
      // W trakcie ostrzeżenia wymagamy jawnego kliknięcia — aktywność nie resetuje timera.
      if (warningRef.current) return
      start()
    }

    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }))

    return () => {
      clearAll()
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity))
    }
  }, [user, start, clearAll])

  return { warning, remainingSec, extend }
}
