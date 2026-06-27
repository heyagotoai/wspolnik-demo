import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { XIcon, WalletIcon, EditIcon, TrashIcon, PlusIcon } from '../ui/Icons'
import { roundMoney2 } from '../../lib/money'
import { paymentHistoryBadgeClass, paymentHistoryDisplay } from '../../lib/paymentDisplay'
import { mapSupabaseError } from '../../lib/userFacingErrors'
import { useToast } from '../ui/Toast'
import { useConfirm } from '../ui/ConfirmDialog'

interface PaymentRow {
  id: string
  amount: number
  payment_date: string
  title: string | null
  confirmed_by_admin: boolean
  parent_payment_id: string | null
  parent_title: string | null
}

interface ApartmentOption {
  id: string
  number: string
}

interface Props {
  apartmentId: string
  apartmentNumber: string
  /** Agregat z tabeli lokali (tylko wpłaty potwierdzone) — do porównania z sumą z listy */
  tablePaymentsTotal: number
  /** Lista lokali (do przeniesienia wpłaty do innego lokalu) */
  apartments: ApartmentOption[]
  /** Wywoływane po każdej zmianie (dodanie/edycja/usunięcie) — odświeżenie sald w panelu */
  onChanged: () => void
  onClose: () => void
}

interface EditForm {
  amount: string
  payment_date: string
  title: string
  apartment_id: string
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(roundMoney2(n))

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

/** ISO date dla <input type="date"> — przycina ewentualny czas. */
const toInputDate = (dateStr: string) => dateStr.slice(0, 10)

export default function ApartmentPaymentsModal({
  apartmentId,
  apartmentNumber,
  tablePaymentsTotal,
  apartments,
  onChanged,
  onClose,
}: Props) {
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [reloadKey, setReloadKey] = useState(0)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState<EditForm>({
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    title: '',
    apartment_id: apartmentId,
  })
  const [busy, setBusy] = useState(false)

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
            parent_payment_id: p.parent_payment_id,
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
  }, [apartmentId, reloadKey])

  const refresh = () => {
    setReloadKey(k => k + 1)
    onChanged()
  }

  const confirmedSum = roundMoney2(
    rows.filter(r => r.confirmed_by_admin).reduce((s, r) => s + r.amount, 0),
  )
  const pendingSum = roundMoney2(
    rows.filter(r => !r.confirmed_by_admin).reduce((s, r) => s + r.amount, 0),
  )
  const pendingCount = rows.filter(r => !r.confirmed_by_admin).length

  const sumMismatch =
    Math.abs(confirmedSum - roundMoney2(tablePaymentsTotal)) > 0.009

  const startEdit = (p: PaymentRow) => {
    setAdding(false)
    setEditingId(p.id)
    setEditForm({
      amount: String(p.amount),
      payment_date: toInputDate(p.payment_date),
      title: p.title ?? '',
      apartment_id: apartmentId,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
  }

  const parseAmount = (raw: string): number | null => {
    const n = Number(raw.replace(',', '.'))
    if (!Number.isFinite(n) || n <= 0) return null
    return n
  }

  const saveEdit = async (id: string) => {
    if (!editForm) return
    const amount = parseAmount(editForm.amount)
    if (amount === null) {
      toast('Podaj poprawną kwotę większą od zera.', 'error')
      return
    }
    if (!editForm.payment_date) {
      toast('Podaj datę wpłaty.', 'error')
      return
    }
    setBusy(true)
    try {
      const body: Record<string, unknown> = {
        amount: amount.toFixed(2),
        payment_date: editForm.payment_date,
        title: editForm.title.trim(),
      }
      if (editForm.apartment_id && editForm.apartment_id !== apartmentId) {
        body.apartment_id = editForm.apartment_id
      }
      await api.patch(`/payments/${id}`, body)
      const movedAway = editForm.apartment_id !== apartmentId
      toast(movedAway ? 'Wpłatę przeniesiono do innego lokalu.' : 'Wpłatę zaktualizowano.', 'success')
      cancelEdit()
      refresh()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Nie udało się zapisać zmian.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const saveAdd = async () => {
    const amount = parseAmount(addForm.amount)
    if (amount === null) {
      toast('Podaj poprawną kwotę większą od zera.', 'error')
      return
    }
    if (!addForm.payment_date) {
      toast('Podaj datę wpłaty.', 'error')
      return
    }
    setBusy(true)
    try {
      await api.post('/payments', {
        apartment_id: addForm.apartment_id,
        amount: amount.toFixed(2),
        payment_date: addForm.payment_date,
        title: addForm.title.trim() || null,
      })
      toast('Dodano wpłatę.', 'success')
      setAdding(false)
      setAddForm({
        amount: '',
        payment_date: new Date().toISOString().slice(0, 10),
        title: '',
        apartment_id: apartmentId,
      })
      refresh()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Nie udało się dodać wpłaty.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const removePayment = async (p: PaymentRow) => {
    const isSplit = !!p.parent_payment_id
    const ok = await confirm({
      title: 'Usunąć wpłatę?',
      message: isSplit
        ? `Ta wpłata jest częścią rozbicia zbiorczego. Usunięta zostanie cała wpłata nadrzędna wraz ze wszystkimi rozbiciami (${formatCurrency(p.amount)}).`
        : `Usunąć wpłatę ${formatCurrency(p.amount)} z dnia ${formatDate(p.payment_date)}? Operacja jest nieodwracalna.`,
      confirmLabel: 'Usuń',
      danger: true,
    })
    if (!ok) return
    setBusy(true)
    try {
      await api.delete(`/payments/${p.id}`)
      toast('Wpłata usunięta.', 'success')
      refresh()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Nie udało się usunąć wpłaty.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full px-2.5 py-1.5 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage'

  const renderForm = (form: EditForm, onChange: (f: EditForm) => void, onSave: () => void, onCancel: () => void, allowReassign: boolean) => (
    <div className="rounded-[var(--radius-input)] bg-sage-pale/20 border border-sage-pale/60 p-3 space-y-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <label className="block">
          <span className="text-xs text-slate">Kwota (PLN)</span>
          <input
            type="text"
            inputMode="decimal"
            value={form.amount}
            onChange={e => onChange({ ...form, amount: e.target.value })}
            className={inputCls}
            placeholder="0,00"
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate">Data wpłaty</span>
          <input
            type="date"
            value={form.payment_date}
            onChange={e => onChange({ ...form, payment_date: e.target.value })}
            className={inputCls}
          />
        </label>
      </div>
      <label className="block">
        <span className="text-xs text-slate">Tytuł (opcjonalnie)</span>
        <input
          type="text"
          value={form.title}
          onChange={e => onChange({ ...form, title: e.target.value })}
          className={inputCls}
          placeholder="np. Wpłata gotówkowa"
        />
      </label>
      <label className="block">
        <span className="text-xs text-slate">
          {allowReassign ? 'Lokal (przeniesienie)' : 'Lokal'}
        </span>
        <select
          value={form.apartment_id}
          onChange={e => onChange({ ...form, apartment_id: e.target.value })}
          className={inputCls}
        >
          {apartments.map(a => (
            <option key={a.id} value={a.id}>
              Lokal {a.number}
              {a.id === apartmentId ? ' (bieżący)' : ''}
            </option>
          ))}
        </select>
      </label>
      <div className="flex justify-end gap-2 pt-0.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="px-3 py-1.5 text-sm font-medium text-slate hover:text-charcoal transition-colors disabled:opacity-50"
        >
          Anuluj
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="px-3 py-1.5 text-sm font-medium text-white bg-sage rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50"
        >
          Zapisz
        </button>
      </div>
    </div>
  )

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/40" onClick={onClose} aria-hidden />
      <div
        className="relative bg-white rounded-[var(--radius-card)] shadow-lg w-full max-w-3xl max-h-[min(90vh,640px)] flex flex-col"
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
              <p className="text-xs text-slate">Korekta i weryfikacja zapisów w systemie</p>
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

        <div className="px-5 py-3 border-b border-cream-medium/60 shrink-0">
          {!adding ? (
            <button
              type="button"
              onClick={() => {
                cancelEdit()
                setAdding(true)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-sage border border-sage/40 rounded-[var(--radius-button)] hover:bg-sage-pale/30 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Dodaj wpłatę ręcznie
            </button>
          ) : (
            renderForm(addForm, setAddForm, saveAdd, () => setAdding(false), true)
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
                const isSplitChild = !!p.parent_payment_id
                return (
                  <li key={p.id} className="py-3 first:pt-0">
                    {editingId === p.id && editForm ? (
                      renderForm(editForm, setEditForm, () => saveEdit(p.id), cancelEdit, true)
                    ) : (
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
                        <div className="flex items-center gap-2 shrink-0">
                          <p className="text-sm font-semibold text-sage tabular-nums">
                            +{formatCurrency(p.amount)}
                          </p>
                          <div className="flex items-center gap-1">
                            {!isSplitChild && (
                              <button
                                type="button"
                                onClick={() => startEdit(p)}
                                disabled={busy}
                                className="p-1.5 text-outline hover:text-sage transition-colors disabled:opacity-40"
                                title="Edytuj / przenieś"
                                aria-label="Edytuj wpłatę"
                              >
                                <EditIcon className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removePayment(p)}
                              disabled={busy}
                              className="p-1.5 text-outline hover:text-error transition-colors disabled:opacity-40"
                              title={isSplitChild ? 'Usuń całą wpłatę zbiorczą' : 'Usuń wpłatę'}
                              aria-label="Usuń wpłatę"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
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
