import { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useDemoRole } from '../demo/DemoRoleContext'

type Role = 'admin' | 'resident' | null

interface RoleState {
  role: Role
  isAdmin: boolean
  isResident: boolean
  loading: boolean
}

export function useRole(): RoleState {
  const { user } = useAuth()
  const demoRole = useDemoRole()
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setRole(null)
      setLoading(false)
      return
    }

    if (demoRole) {
      setRole(demoRole.role)
      setLoading(false)
      return
    }

    const fetchRole = async () => {
      setLoading(true)
      const { data, error } = await getSupabase()
        .from('residents')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error || !data) {
        setRole(null)
      } else {
        setRole(data.role as Role)
      }
      setLoading(false)
    }

    void fetchRole()
  }, [user, demoRole?.role])

  return {
    role,
    isAdmin: role === 'admin',
    isResident: role === 'resident',
    loading,
  }
}
