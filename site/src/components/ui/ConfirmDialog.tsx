import { createContext, useCallback, useContext, useState, useRef } from 'react'
import type { ReactNode } from 'react'

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts)
    return new Promise((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const handleClose = (result: boolean) => {
    resolveRef.current?.(result)
    resolveRef.current = null
    setOptions(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {/* Dialog overlay */}
      {options && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-charcoal/40"
            onClick={() => handleClose(false)}
          />
          <div className="relative bg-white rounded-[var(--radius-card)] shadow-lg p-6 max-w-sm w-full mx-4 animate-scale-in">
            {options.title && (
              <h3 className="text-lg font-semibold text-charcoal mb-2">
                {options.title}
              </h3>
            )}
            <p className="text-sm text-slate mb-6">{options.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleClose(false)}
                className="px-4 py-2 text-sm font-medium text-slate hover:text-charcoal transition-colors"
              >
                {options.cancelLabel || 'Anuluj'}
              </button>
              <button
                onClick={() => handleClose(true)}
                className={`px-4 py-2 text-sm font-medium text-white rounded-[var(--radius-button)] transition-colors ${
                  options.danger
                    ? 'bg-error hover:bg-error/80'
                    : 'bg-sage hover:bg-sage-light'
                }`}
              >
                {options.confirmLabel || 'Potwierdź'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmContextValue {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm musi być używany wewnątrz ConfirmProvider')
  }
  return context
}
