import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { formatCaughtError } from '../../lib/userFacingErrors'

interface Apartment {
  id: string
  number: string
  area_m2: string | null
  owner_resident_id: string | null
  owner_name: string | null
  initial_balance: string | null
  billing_group_id: string | null
}

interface BillingGroup {
  id: string
  name: string
  apartments: Apartment[]
  created_at: string
}

interface BalanceInfo {
  group_id: string
  group_name: string
  combined_balance: string
  apartments: {
    id: string
    number: string
    balance: string
    total_charges: string
    total_payments: string
    initial_balance: string
  }[]
}

interface SplitResult {
  parent_payment_id: string
  total_amount: string
  split_month: string
  children: { apartment_id: string; apartment_number: string; amount: string }[]
}

export function BillingGroupsPanel() {
  const { toast } = useToast()
  const { confirm } = useConfirm()

  const [groups, setGroups] = useState<BillingGroup[]>([])
  const [allApartments, setAllApartments] = useState<Apartment[]>([])
  const [loading, setLoading] = useState(true)

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  // Assign apartments
  const [assigningGroupId, setAssigningGroupId] = useState<string | null>(null)
  const [selectedAptIds, setSelectedAptIds] = useState<string[]>([])
  const [assigning, setAssigning] = useState(false)

  // Payment split form
  const [paymentGroupId, setPaymentGroupId] = useState<string | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: '',
    title: '',
    split_month: '',
  })
  const [splitting, setSplitting] = useState(false)
  const [splitResult, setSplitResult] = useState<SplitResult | null>(null)

  // Balance view
  const [balanceGroupId, setBalanceGroupId] = useState<string | null>(null)
  const [balance, setBalance] = useState<BalanceInfo | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)

  // Edit name
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const fetchAll = async () => {
    try {
      const [groupsData, aptsRes] = await Promise.all([
        api.get<BillingGroup[]>('/billing-groups'),
        supabase.from('apartments').select('id, number, area_m2, owner_resident_id, initial_balance, billing_group_id').order('number'),
      ])
      setGroups(groupsData)
      setAllApartments((aptsRes.data || []) as Apartment[])
    } catch (e: unknown) {
      toast(formatCaughtError(e, 'Błąd ładowania'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  // Apartments not assigned to any group
  const unassignedApartments = allApartments.filter(a => !a.billing_group_id)

  // --- Create group ---
  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await api.post('/billing-groups', { name: newName.trim() })
      toast('Grupa utworzona', 'success')
      setNewName('')
      setShowCreateForm(false)
      await fetchAll()
    } catch (e: unknown) {
      toast(formatCaughtError(e, 'Błąd tworzenia grupy'), 'error')
    } finally {
      setCreating(false)
    }
  }

  // --- Edit name ---
  const handleEditName = async (groupId: string) => {
    if (!editName.trim()) return
    try {
      await api.patch(`/billing-groups/${groupId}`, { name: editName.trim() })
      toast('Nazwa zmieniona', 'success')
      setEditingGroupId(null)
      await fetchAll()
    } catch (e: unknown) {
      toast(formatCaughtError(e, 'Błąd'), 'error')
    }
  }

  // --- Delete group ---
  const handleDelete = async (groupId: string, groupName: string) => {
    const ok = await confirm({
      title: 'Usuń grupę',
      message: `Czy na pewno chcesz usunąć grupę "${groupName}"? Lokale zostaną odłączone (dane finansowe bez zmian).`,
      confirmLabel: 'Usuń',
      danger: true,
    })
    if (!ok) return
    try {
      await api.delete(`/billing-groups/${groupId}`)
      toast('Grupa usunięta', 'success')
      await fetchAll()
    } catch (e: unknown) {
      toast(formatCaughtError(e, 'Błąd'), 'error')
    }
  }

  // --- Assign apartments ---
  const handleAssign = async (groupId: string) => {
    if (selectedAptIds.length === 0) return
    setAssigning(true)
    try {
      await api.post(`/billing-groups/${groupId}/apartments`, {
        apartment_ids: selectedAptIds,
      })
      toast('Lokale przypisane', 'success')
      setAssigningGroupId(null)
      setSelectedAptIds([])
      await fetchAll()
    } catch (e: unknown) {
      toast(formatCaughtError(e, 'Błąd'), 'error')
    } finally {
      setAssigning(false)
    }
  }

  // --- Remove apartment from group ---
  const handleRemoveApt = async (groupId: string, aptId: string, aptNumber: string) => {
    const ok = await confirm({
      title: 'Usuń lokal z grupy',
      message: `Usunąć lokal ${aptNumber} z grupy? Istniejące wpłaty i naliczenia pozostaną bez zmian.`,
      confirmLabel: 'Usuń',
      danger: true,
    })
    if (!ok) return
    try {
      await api.delete(`/billing-groups/${groupId}/apartments/${aptId}`)
      toast(`Lokal ${aptNumber} usunięty z grupy`, 'success')
      await fetchAll()
    } catch (e: unknown) {
      toast(formatCaughtError(e, 'Błąd'), 'error')
    }
  }

  // --- Split payment ---
  const handleSplitPayment = async (groupId: string) => {
    if (!paymentForm.amount || !paymentForm.payment_date) return
    setSplitting(true)
    setSplitResult(null)
    try {
      const result = await api.post<SplitResult>(
        `/billing-groups/${groupId}/split-payment`,
        {
          amount: paymentForm.amount,
          payment_date: paymentForm.payment_date,
          title: paymentForm.title || undefined,
          split_month: paymentForm.split_month || undefined,
        },
      )
      setSplitResult(result)
      toast('Wpłata rozdzielona', 'success')
      setPaymentForm({ amount: '', payment_date: '', title: '', split_month: '' })
    } catch (e: unknown) {
      toast(formatCaughtError(e, 'Błąd rozbicia'), 'error')
    } finally {
      setSplitting(false)
    }
  }

  // --- Balance ---
  const handleShowBalance = async (groupId: string) => {
    if (balanceGroupId === groupId) {
      setBalanceGroupId(null)
      setBalance(null)
      return
    }
    setBalanceGroupId(groupId)
    setLoadingBalance(true)
    try {
      const data = await api.get<BalanceInfo>(`/billing-groups/${groupId}/balance`)
      setBalance(data)
    } catch (e: unknown) {
      toast(formatCaughtError(e, 'Błąd'), 'error')
      setBalanceGroupId(null)
    } finally {
      setLoadingBalance(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate">Ładowanie...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-charcoal">Grupy rozliczeniowe</h2>
        <button
          onClick={() => setShowCreateForm(v => !v)}
          className="bg-sage text-white text-sm font-medium px-4 py-2 rounded-[var(--radius-button)] hover:bg-sage-light transition-colors"
        >
          {showCreateForm ? 'Anuluj' : '+ Nowa grupa'}
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-5 space-y-3">
          <h2 className="text-sm font-semibold text-charcoal">Nowa grupa rozliczeniowa</h2>
          <input
            type="text"
            placeholder="Nazwa grupy, np. Kowalski - lokale 3, 5"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="bg-sage text-white text-sm font-medium px-4 py-2 rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50"
          >
            {creating ? 'Tworzenie...' : 'Utwórz'}
          </button>
        </div>
      )}

      {/* Groups list */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center text-slate">
          Brak grup rozliczeniowych. Utwórz pierwszą grupę, aby łączyć lokale.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(g => (
            <div key={g.id} className="bg-white rounded-[var(--radius-card)] shadow-ambient p-5 space-y-4">
              {/* Group header */}
              <div className="flex items-center justify-between">
                {editingGroupId === g.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-cream-deep rounded-[var(--radius-input)] text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                      onKeyDown={e => e.key === 'Enter' && handleEditName(g.id)}
                    />
                    <button onClick={() => handleEditName(g.id)} className="text-sage text-sm font-medium hover:text-sage-light">
                      Zapisz
                    </button>
                    <button onClick={() => setEditingGroupId(null)} className="text-slate text-sm hover:text-charcoal">
                      Anuluj
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-charcoal">{g.name}</h3>
                    <span className="px-2 py-0.5 bg-sage-pale/30 text-sage text-xs font-medium rounded-full">
                      {g.apartments.length} {g.apartments.length === 1 ? 'lokal' : g.apartments.length < 5 ? 'lokale' : 'lokali'}
                    </span>
                  </div>
                )}
                {editingGroupId !== g.id && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditingGroupId(g.id); setEditName(g.name) }}
                      className="p-1.5 text-outline hover:text-sage transition-colors text-sm"
                      title="Zmień nazwę"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(g.id, g.name)}
                      className="p-1.5 text-outline hover:text-error transition-colors text-sm"
                      title="Usuń grupę"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>

              {/* Apartments in group */}
              {g.apartments.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate uppercase tracking-wider">Lokale w grupie</p>
                  <div className="flex flex-wrap gap-2">
                    {g.apartments.map(a => (
                      <div
                        key={a.id}
                        className="flex items-center gap-1.5 bg-cream-dark/50 px-3 py-1.5 rounded-full text-sm"
                      >
                        <span className="font-medium text-charcoal">Lokal {a.number}</span>
                        {a.owner_name && (
                          <span className="text-slate text-xs">({a.owner_name})</span>
                        )}
                        <button
                          onClick={() => handleRemoveApt(g.id, a.id, a.number)}
                          className="ml-1 text-outline hover:text-error transition-colors text-xs"
                          title="Usuń z grupy"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-cream-deep/50">
                <button
                  onClick={() => {
                    setAssigningGroupId(assigningGroupId === g.id ? null : g.id)
                    setSelectedAptIds([])
                    setPaymentGroupId(null)
                    setSplitResult(null)
                  }}
                  className="text-sage text-sm font-medium hover:text-sage-light transition-colors"
                >
                  + Dodaj lokale
                </button>
                <button
                  onClick={() => {
                    setPaymentGroupId(paymentGroupId === g.id ? null : g.id)
                    setSplitResult(null)
                    setAssigningGroupId(null)
                  }}
                  className="text-sage text-sm font-medium hover:text-sage-light transition-colors"
                >
                  💰 Wpłata grupowa
                </button>
                <button
                  onClick={() => handleShowBalance(g.id)}
                  className="text-sage text-sm font-medium hover:text-sage-light transition-colors"
                >
                  📊 {balanceGroupId === g.id ? 'Ukryj saldo' : 'Saldo'}
                </button>
              </div>

              {/* Assign apartments form */}
              {assigningGroupId === g.id && (
                <div className="bg-sage-pale/10 rounded-[var(--radius-card)] p-4 space-y-3">
                  <p className="text-sm font-medium text-charcoal">Wybierz lokale do przypisania</p>
                  {unassignedApartments.length === 0 ? (
                    <p className="text-sm text-slate">Wszystkie lokale są już przypisane do grup.</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {unassignedApartments.map(a => (
                          <label
                            key={a.id}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer border transition-colors ${
                              selectedAptIds.includes(a.id)
                                ? 'bg-sage text-white border-sage'
                                : 'bg-white text-charcoal border-cream-deep hover:border-sage'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedAptIds.includes(a.id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedAptIds(prev => [...prev, a.id])
                                } else {
                                  setSelectedAptIds(prev => prev.filter(id => id !== a.id))
                                }
                              }}
                              className="hidden"
                            />
                            Lokal {a.number}
                          </label>
                        ))}
                      </div>
                      <button
                        onClick={() => handleAssign(g.id)}
                        disabled={assigning || selectedAptIds.length === 0}
                        className="bg-sage text-white text-sm font-medium px-4 py-2 rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50"
                      >
                        {assigning ? 'Przypisywanie...' : `Przypisz (${selectedAptIds.length})`}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Payment split form */}
              {paymentGroupId === g.id && (
                <div className="bg-sage-pale/10 rounded-[var(--radius-card)] p-4 space-y-3">
                  <p className="text-sm font-medium text-charcoal">Wpłata grupowa z auto-rozbiciem</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate mb-1">Kwota (PLN) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="np. 1500.00"
                        value={paymentForm.amount}
                        onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                        className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate mb-1">Data wpłaty *</label>
                      <input
                        type="date"
                        value={paymentForm.payment_date}
                        onChange={e => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate mb-1">Tytuł wpłaty</label>
                      <input
                        type="text"
                        placeholder="Opcjonalny tytuł"
                        value={paymentForm.title}
                        onChange={e => setPaymentForm(f => ({ ...f, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate mb-1">Miesiąc naliczeń (do proporcji)</label>
                      <input
                        type="month"
                        value={paymentForm.split_month ? paymentForm.split_month.substring(0, 7) : ''}
                        onChange={e => setPaymentForm(f => ({ ...f, split_month: e.target.value ? `${e.target.value}-01` : '' }))}
                        className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate">
                    Wpłata zostanie automatycznie podzielona proporcjonalnie do naliczeń za wybrany miesiąc.
                    Jeśli miesiąc nie jest podany, użyty zostanie miesiąc daty wpłaty.
                  </p>
                  <button
                    onClick={() => handleSplitPayment(g.id)}
                    disabled={splitting || !paymentForm.amount || !paymentForm.payment_date}
                    className="bg-sage text-white text-sm font-medium px-4 py-2 rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50"
                  >
                    {splitting ? 'Dzielenie...' : 'Podziel wpłatę'}
                  </button>

                  {/* Split result */}
                  {splitResult && (
                    <div className="bg-white rounded-[var(--radius-card)] p-3 space-y-2 border border-sage/20">
                      <p className="text-sm font-medium text-sage">Wpłata podzielona ({splitResult.total_amount} PLN)</p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-slate">
                            <th className="pb-1">Lokal</th>
                            <th className="pb-1 text-right">Kwota</th>
                          </tr>
                        </thead>
                        <tbody>
                          {splitResult.children.map(c => (
                            <tr key={c.apartment_id} className="border-t border-cream-deep/30">
                              <td className="py-1">Lokal {c.apartment_number}</td>
                              <td className="py-1 text-right font-medium">{Number(c.amount).toFixed(2)} PLN</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Balance view */}
              {balanceGroupId === g.id && (
                <div className="bg-sage-pale/10 rounded-[var(--radius-card)] p-4 space-y-3">
                  {loadingBalance ? (
                    <p className="text-sm text-slate">Ładowanie salda...</p>
                  ) : balance ? (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-charcoal">Saldo łączne</p>
                        <p className={`text-lg font-bold ${
                          Number(balance.combined_balance) >= 0 ? 'text-sage' : 'text-error'
                        }`}>
                          {Number(balance.combined_balance).toFixed(2)} PLN
                        </p>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-slate border-b border-cream-deep">
                            <th className="pb-1">Lokal</th>
                            <th className="pb-1 text-right">Naliczenia</th>
                            <th className="pb-1 text-right">Wpłaty</th>
                            <th className="pb-1 text-right">Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {balance.apartments.map(a => (
                            <tr key={a.id} className="border-t border-cream-deep/30">
                              <td className="py-1.5 font-medium">Lokal {a.number}</td>
                              <td className="py-1.5 text-right text-error">{Number(a.total_charges).toFixed(2)}</td>
                              <td className="py-1.5 text-right text-sage">{Number(a.total_payments).toFixed(2)}</td>
                              <td className={`py-1.5 text-right font-medium ${
                                Number(a.balance) >= 0 ? 'text-sage' : 'text-error'
                              }`}>
                                {Number(a.balance).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Zachowanie kompatybilności — przekierowanie w App.tsx na Naliczenia z zakładką. */
export default function BillingGroupsPage() {
  return <BillingGroupsPanel />
}
