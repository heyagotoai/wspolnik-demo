import { useDemoRole } from './DemoRoleContext'
import { demoStore } from './demoStore'
import { useToast } from '../components/ui/Toast'

export function DemoBanner() {
  const demo = useDemoRole()
  const { toast } = useToast()
  if (!demo) return null

  return (
    <div className="rounded-[var(--radius-input)] border border-amber-200 bg-amber-light/50 px-4 py-3 mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="text-sm text-charcoal space-y-1.5 min-w-0 flex-1">
        <p>
          <strong>Tryb demonstracyjny</strong> — wszystko działa na przykładowych danych w przeglądarce; nic nie trafia do
          prawdziwej bazy wspólnoty.
        </p>
        <p className="text-slate text-xs leading-relaxed">
          Przyciski „Mieszkaniec / Zarządca / Administrator” pokazują, jakie menu i akcje widzi każda rola (w działającym
          systemie każdy ma osobne konto). „Resetuj demo” przywraca dane startowe tej sesji.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <span className="text-xs text-slate shrink-0">Podgląd roli:</span>
        <button
          type="button"
          title="Menu i funkcje dostępne mieszkańcowi w panelu"
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
          title="Panel administracyjny z ograniczeniami — bez usuwania mieszkańców itp."
          onClick={() => demo.setRole('manager')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            demo.role === 'manager'
              ? 'bg-sky-600 text-white'
              : 'bg-cream text-slate hover:bg-cream-medium'
          }`}
        >
          Zarządca
        </button>
        <button
          type="button"
          title="Pełne uprawnienia w panelu administracyjnym"
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
          title="Przywraca listę startową i przeładowuje stronę"
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
