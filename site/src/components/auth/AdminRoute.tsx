import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useIdleLogout } from '../../hooks/useIdleLogout'
import { useRole } from '../../hooks/useRole'
import IdleWarningDialog from './IdleWarningDialog'
import LegalConsentGate from './LegalConsentGate'

const ADMIN_IDLE_MS = 15 * 60 * 1000
const ADMIN_WARN_MS = 60 * 1000

export default function AdminRoute() {
  const { user, loading: authLoading } = useAuth()
  const { isAdminOrManager, loading: roleLoading } = useRole()
  const { warning, remainingSec, extend } = useIdleLogout(ADMIN_IDLE_MS, { warnMs: ADMIN_WARN_MS })

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
      <IdleWarningDialog open={warning} remainingSec={remainingSec} onExtend={extend} />
    </LegalConsentGate>
  )
}
