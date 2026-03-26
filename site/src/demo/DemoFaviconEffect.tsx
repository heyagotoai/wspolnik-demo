import { useEffect } from 'react'
import { isDemoApp } from './isDemoApp'

/** W trybie demo ustawia favicon na demo-logo.png (index.html domyślnie wskazuje /logo.png). */
export function DemoFaviconEffect() {
  useEffect(() => {
    if (!isDemoApp()) return
    const link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
    if (link) {
      link.type = 'image/png'
      link.href = '/demo-logo.png'
    }
  }, [])
  return null
}
