import { useLocation } from 'react-router-dom'
import { isDemoApp } from './isDemoApp'

/** Prefiks URL dla tras demo: '' w mockach / izolacji lub '/demo' przy prawdziwym backendzie na ścieżce /demo. */
export function useDemoBasePath(): string {
  const { pathname } = useLocation()
  if (isDemoApp()) return ''
  if (pathname.startsWith('/demo')) return '/demo'
  return ''
}
