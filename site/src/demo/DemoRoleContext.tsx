import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { DEMO_ROLE_STORAGE_KEY } from './demoConstants'

export type DemoRole = 'admin' | 'resident' | 'manager'

interface DemoRoleContextValue {
  role: DemoRole
  setRole: (r: DemoRole) => void
}

export const DemoRoleContext = createContext<DemoRoleContextValue | null>(null)

function readStoredRole(): DemoRole {
  try {
    const s = sessionStorage.getItem(DEMO_ROLE_STORAGE_KEY)
    if (s === 'admin' || s === 'manager' || s === 'resident') return s
    return 'resident'
  } catch {
    return 'resident'
  }
}

export function DemoRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<DemoRole>(readStoredRole)

  const setRole = useCallback((r: DemoRole) => {
    try {
      sessionStorage.setItem(DEMO_ROLE_STORAGE_KEY, r)
    } catch { /* ignore */ }
    setRoleState(r)
  }, [])

  const value = useMemo(() => ({ role, setRole }), [role, setRole])

  return <DemoRoleContext.Provider value={value}>{children}</DemoRoleContext.Provider>
}

export function useDemoRole(): DemoRoleContextValue | null {
  return useContext(DemoRoleContext)
}
