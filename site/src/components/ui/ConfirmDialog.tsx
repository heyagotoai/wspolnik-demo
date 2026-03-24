import { createContext, useCallback, useContext, useState, useRef } from 'react'
import type { ReactNode } from 'react'

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  /** If set, user must type this exact text to enable the confirm button. */
  requireText?: string
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [typedText, setTypedText] = useState('')
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts)
    setTypedText('')
    return new Promise((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const handleClose = (result: boolean) => {
    resolveRef.current?.(result)
    resolveRef.current = null
    setOptions(null)
    setTypedText('')
  }

  const confirmDisabled = options?.requireText
    ? typedText !== options.requireText
    : false

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
            <p className="text-sm text-slate mb-4">{options.message}</p>
            {options.requireText && (
              <div className="mb-4">
                <p className="text-xs text-slate mb-2">
                  Wpisz <span className="font-bold text-error">{options.requireText}</span> aby potwierdzić:
                </p>
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-error/30 focus:border-error"
                  autoFocus
                  spellCheck={false}
                />
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleClose(false)}
                className="px-4 py-2 text-sm font-medium text-slate hover:text-charcoal transition-colors"
              >
                {options.cancelLabel || 'Anuluj'}
              </button>
              <button
                onClick={() => handleClose(true)}
                disabled={confirmDisabled}
                className={`px-4 py-2 text-sm font-medium text-white rounded-[var(--radius-button)] transition-colors ${
                  options.danger
                    ? 'bg-error hover:bg-error/80'
                    : 'bg-sage hover:bg-sage-light'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
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
