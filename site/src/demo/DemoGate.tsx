import { DemoRoleProvider } from './DemoRoleContext'
import { isDemoApp } from './isDemoApp'

/** W trybie demo opakowuje drzewo w kontekst roli (przełącznik Mieszkaniec / Admin). */
export function DemoGate({ children }: { children: React.ReactNode }) {
  if (!isDemoApp()) return <>{children}</>
  return <DemoRoleProvider>{children}</DemoRoleProvider>
}
