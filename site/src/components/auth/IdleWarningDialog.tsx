interface Props {
  open: boolean
  remainingSec: number
  onExtend: () => void
}

export default function IdleWarningDialog({ open, remainingSec, onExtend }: Props) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-charcoal/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-warning-title"
    >
      <div className="w-full max-w-sm rounded-[var(--radius-card)] bg-cream shadow-ambient p-6 text-center space-y-4">
        <h2 id="idle-warning-title" className="text-lg font-bold text-charcoal">
          Brak aktywności
        </h2>
        <p className="text-sm text-slate">
          Zostaniesz wylogowany za <span className="font-semibold text-charcoal">{remainingSec}</span>{' '}
          {remainingSec === 1 ? 'sekundę' : remainingSec < 5 ? 'sekundy' : 'sekund'}.
        </p>
        <button
          type="button"
          onClick={onExtend}
          className="w-full px-4 py-2.5 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light"
        >
          Zostaję — przedłuż sesję
        </button>
      </div>
    </div>
  )
}
