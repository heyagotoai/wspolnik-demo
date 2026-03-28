import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

type Role = 'admin' | 'resident' | 'manager' | null

interface RoleState {
  role: Role
  isAdmin: boolean
  isManager: boolean
  isAdminOrManager: boolean
  isResident: boolean
  loading: boolean
}

export function useRole(): RoleState {
  const { user } = useAuth()
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setRole(null)
      setLoading(false)
      return
    }

    const fetchRole = async () => {
      setLoading(true)
      const { data, error } = await supabase
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

    fetchRole()
  }, [user])

  return {
    role,
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isAdminOrManager: role === 'admin' || role === 'manager',
    isResident: role === 'resident',
    loading,
  }
}
