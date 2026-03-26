import { useLocation } from 'react-router-dom'
import { DemoRoleProvider } from './DemoRoleContext'
import { hasSupabaseCredentials } from './isDemoApp'

/** W trybie demo opakowuje drzewo w kontekst roli (przełącznik Mieszkaniec / Admin). */
export function DemoGate({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const demo =
    import.meta.env.VITE_DEMO_ONLY === 'true' ||
    import.meta.env.VITE_PUBLIC_DEMO_ROUTES === 'true' ||
    !hasSupabaseCredentials() ||
    pathname.startsWith('/demo')
  if (!demo) return <>{children}</>
  return <DemoRoleProvider>{children}</DemoRoleProvider>
}
