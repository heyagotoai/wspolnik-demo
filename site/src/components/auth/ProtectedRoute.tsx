import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import LegalConsentGate from './LegalConsentGate'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

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
