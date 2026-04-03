import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { XIcon, WalletIcon } from '../ui/Icons'
import { roundMoney2 } from '../../lib/money'
import { paymentHistoryBadgeClass, paymentHistoryDisplay } from '../../lib/paymentDisplay'
import { mapSupabaseError } from '../../lib/userFacingErrors'

interface PaymentRow {
  id: string
  amount: number
  payment_date: string
  title: string | null
  confirmed_by_admin: boolean
  parent_title: string | null
}

interface Props {
  apartmentId: string
  apartmentNumber: string
  /** Agregat z tabeli lokali (tylko wpłaty potwierdzone) — do porównania z sumą z listy */
  tablePaymentsTotal: number
  onClose: () => void
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(roundMoney2(n))

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

export default function ApartmentPaymentsModal({
  apartmentId,
  apartmentNumber,
  tablePaymentsTotal,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<PaymentRow[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      const { data, error: qErr } = await supabase
        .from('payments')
        .select('id, amount, payment_date, title, confirmed_by_admin, parent_payment_id')
        .eq('apartment_id', apartmentId)
        .order('payment_date', { ascending: false })

      if (cancelled) return
      if (qErr) {
        setError(mapSupabaseError(qErr) || 'Nie udało się pobrać wpłat.')
        setRows([])
      } else {
        const raw = (data || []) as {
          id: string
          amount: string | number
          payment_date: string
          title: string | null
          confirmed_by_admin: boolean
          parent_payment_id: string | null
        }[]
        const splitParentIds = [
          ...new Set(
            raw
              .filter(
                p =>
                  p.parent_payment_id &&
                  (p.title ?? '').trim().startsWith('Rozbicie wpłaty'),
              )
              .map(p => p.parent_payment_id as string),
          ),
        ]
        const parentTitleById = new Map<string, string>()
        if (splitParentIds.length > 0) {
          const { data: parents } = await supabase
            .from('payments')
            .select('id, title')
            .in('id', splitParentIds)
          for (const row of parents || []) {
            parentTitleById.set(row.id, (row.title ?? '') as string)
          }
        }
        if (cancelled) return
        setRows(
          raw.map(p => ({
            id: p.id,
            amount: Number(p.amount),
            payment_date: p.payment_date,
            title: p.title,
            confirmed_by_admin: p.confirmed_by_admin,
            parent_title: p.parent_payment_id
              ? parentTitleById.get(p.parent_payment_id) ?? null
              : null,
          })),
        )
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [apartmentId])

  const confirmedSum = roundMoney2(
    rows.filter(r => r.confirmed_by_admin).reduce((s, r) => s + r.amount, 0),
  )
  const pendingSum = roundMoney2(
    rows.filter(r => !r.confirmed_by_admin).reduce((s, r) => s + r.amount, 0),
  )
  const pendingCount = rows.filter(r => !r.confirmed_by_admin).length

  const sumMismatch =
    Math.abs(confirmedSum - roundMoney2(tablePaymentsTotal)) > 0.009

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/40" onClick={onClose} aria-hidden />
      <div
        className="relative bg-white rounded-[var(--radius-card)] shadow-lg w-full max-w-lg max-h-[min(90vh,640px)] flex flex-col"
        role="dialog"
        aria-labelledby="apt-payments-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-cream-deep shrink-0 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-[var(--radius-input)] bg-sage-pale/30 flex items-center justify-center shrink-0">
              <WalletIcon className="w-5 h-5 text-sage" />
            </div>
            <div className="min-w-0">
              <h2 id="apt-payments-title" className="text-lg font-semibold text-charcoal truncate">
                Wpłaty — lokal {apartmentNumber}
              </h2>
              <p className="text-xs text-slate">Weryfikacja zapisów w systemie</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-outline hover:text-charcoal shrink-0"
            aria-label="Zamknij"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-cream-medium/80 bg-cream/40 text-sm space-y-1.5 shrink-0">
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
            <span className="text-slate">Suma wpłat potwierdzonych (lista)</span>
            <span className="font-semibold text-charcoal tabular-nums">{formatCurrency(confirmedSum)}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs">
            <span className="text-outline">Zgodność z kolumną „Saldo” (tylko wpłaty)</span>
            <span className="text-charcoal tabular-nums">{formatCurrency(roundMoney2(tablePaymentsTotal))}</span>
          </div>
          {sumMismatch && !loading && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200/80 rounded-[var(--radius-input)] px-2 py-1.5">
              Różnica między sumą z listy a agregatem w tabeli — odśwież stronę lokali lub sprawdź
              zsynchronizowane dane.
            </p>
          )}
          {pendingCount > 0 && (
            <p className="text-xs text-amber-800">
              Oczekujące na potwierdzenie: {pendingCount}{' '}
              {pendingCount === 1 ? 'wpłata' : 'wpłat'} ({formatCurrency(pendingSum)}) — nie wchodzą w saldo.
            </p>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 min-h-0">
          {loading && <p className="text-sm text-slate py-6 text-center">Ładowanie...</p>}
          {error && (
            <div className="p-3 bg-error-container text-error text-sm rounded-[var(--radius-input)]">
              {error}
            </div>
          )}
          {!loading && !error && rows.length === 0 && (
            <p className="text-sm text-slate py-6 text-center">Brak wpłat przypisanych do tego lokalu.</p>
          )}
          {!loading && !error && rows.length > 0 && (
            <ul className="space-y-0 divide-y divide-cream-medium">
              {rows.map(p => {
                const { primaryLine, badges } = paymentHistoryDisplay(p.title, {
                  parentTitle: p.parent_title,
                })
                return (
                  <li key={p.id} className="py-3 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="text-sm font-medium text-charcoal">{primaryLine}</p>
                          {badges.map((badge, bi) => (
                            <span
                              key={`${p.id}-${bi}`}
                              title={badge.hint}
                              className={`inline-flex shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium ${paymentHistoryBadgeClass(badge.kind)}`}
                            >
                              {badge.label}
                            </span>
                          ))}
                          {!p.confirmed_by_admin && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                              Oczekuje
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate mt-0.5">{formatDate(p.payment_date)}</p>
                      </div>
                      <p className="text-sm font-semibold text-sage tabular-nums shrink-0">
                        +{formatCurrency(p.amount)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-3 border-t border-cream-deep shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
