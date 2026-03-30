import type { ReactNode } from 'react'
import { isDemoApp } from './isDemoApp'

/** Krótka podpowiedź dla zwiedzających wersję demo — ukryta w produkcji. */
export function DemoHelpCallout({ children }: { children: ReactNode }) {
  if (!isDemoApp()) return null
  return (
    <div
      className="rounded-[12px] border border-amber-container/60 bg-amber-container/15 px-4 py-3 text-sm text-slate leading-relaxed"
      role="note"
    >
      {children}
    </div>
  )
}
