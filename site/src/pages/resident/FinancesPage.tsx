import { WalletIcon } from '../../components/ui/Icons'

export default function FinancesPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-charcoal">Finanse</h1>

      <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-cream-medium flex items-center justify-center mx-auto mb-4">
          <WalletIcon className="w-8 h-8 text-outline" />
        </div>
        <h2 className="text-lg font-semibold text-charcoal mb-2">Sekcja w przygotowaniu</h2>
        <p className="text-sm text-slate max-w-md mx-auto">
          Wkrótce znajdziesz tu informacje o swoim saldzie, historię wpłat oraz naliczenia miesięczne.
          Funkcja zostanie uruchomiona po integracji z systemem bankowym.
        </p>
      </div>
    </div>
  )
}
