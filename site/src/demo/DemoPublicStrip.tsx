import { Link, useLocation } from 'react-router-dom'
import { isDemoApp } from './isDemoApp'

/** Pasek pod nagłówkiem na stronach publicznych — tylko w demo. */
export function DemoPublicStrip() {
  const { pathname } = useLocation()
  if (!isDemoApp()) return null

  const panelPath = pathname.startsWith('/demo') ? '/demo/panel' : '/panel'

  return (
    <div className="bg-amber-light/35 border-b border-amber-200/80">
      <div className="mx-auto max-w-[1280px] px-6 py-2.5 text-sm text-charcoal leading-snug">
        <span className="font-semibold">Wersja demonstracyjna. </span>
        To podgląd programu na przykładowych danych — nic nie jest zapisywane w prawdziwym systemie wspólnoty. Wejście do
        panelu:{' '}
        <Link to={panelPath} className="text-sage font-medium underline underline-offset-2 hover:text-sage-light">
          panel mieszkańca / administracji
        </Link>{' '}
        (na stronie głównej jest też przycisk „Tryb demonstracyjny”).
      </div>
    </div>
  )
}
