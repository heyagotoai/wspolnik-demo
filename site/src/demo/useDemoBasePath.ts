import { useLocation } from 'react-router-dom'
import { hasSupabaseCredentials } from './isDemoApp'

/** Prefiks URL dla tras demo: '' (VITE_DEMO_ONLY / VITE_PUBLIC_DEMO_ROUTES / brak .env) lub '/demo'. */
export function useDemoBasePath(): string {
  const { pathname } = useLocation()
  if (
    import.meta.env.VITE_DEMO_ONLY === 'true' ||
    import.meta.env.VITE_PUBLIC_DEMO_ROUTES === 'true' ||
    !hasSupabaseCredentials()
  ) {
    return ''
  }
  if (pathname.startsWith('/demo')) return '/demo'
  return ''
}
