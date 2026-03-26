import { useDemoRole } from './DemoRoleContext'
import { demoStore } from './demoStore'
import { useToast } from '../components/ui/Toast'

export function DemoBanner() {
  const demo = useDemoRole()
  const { toast } = useToast()
  if (!demo) return null

  return (
    <div className="rounded-[var(--radius-input)] border border-amber-200 bg-amber-light/50 px-4 py-3 mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-charcoal">
        <strong>Tryb demonstracyjny</strong> — dane nie są zapisywane na serwerze.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate shrink-0">Widok:</span>
        <button
          type="button"
          onClick={() => demo.setRole('resident')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            demo.role === 'resident'
              ? 'bg-sage text-white'
              : 'bg-cream text-slate hover:bg-cream-medium'
          }`}
        >
          Mieszkaniec
        </button>
        <button
          type="button"
          onClick={() => demo.setRole('admin')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            demo.role === 'admin'
              ? 'bg-amber text-white'
              : 'bg-cream text-slate hover:bg-cream-medium'
          }`}
        >
          Administrator
        </button>
        <button
          type="button"
          onClick={() => {
            demoStore.reset()
            toast('Przywrócono dane startowe demo.', 'success')
            window.location.reload()
          }}
          className="text-xs font-medium text-slate underline hover:text-charcoal"
        >
          Resetuj demo
        </button>
      </div>
    </div>
  )
}
