import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useRole } from '../../hooks/useRole'
import LegalConsentGate from './LegalConsentGate'

export default function AdminRoute() {
  const { user, loading: authLoading } = useAuth()
  const { isAdminOrManager, loading: roleLoading } = useRole()

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="text-slate">Ładowanie...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/logowanie" replace />
  }

  if (!isAdminOrManager) {
    return <Navigate to="/panel" replace />
  }

  return (
    <LegalConsentGate>
      <Outlet />
    </LegalConsentGate>
  )
}
