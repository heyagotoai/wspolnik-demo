import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useIdleLogout } from '../../hooks/useIdleLogout'
import LegalConsentGate from './LegalConsentGate'

const RESIDENT_IDLE_MS = 30 * 60 * 1000

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  useIdleLogout(RESIDENT_IDLE_MS)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="text-slate">Ładowanie...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/logowanie" replace />
  }

  return (
    <LegalConsentGate>
      <Outlet />
    </LegalConsentGate>
  )
}
