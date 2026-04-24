import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { PlusIcon, EditIcon, TrashIcon, XIcon, HomeIcon } from '../../components/ui/Icons'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { useRole } from '../../hooks/useRole'
import { formatCaughtError, mapSupabaseError } from '../../lib/userFacingErrors'
import { DemoHelpCallout } from '../../demo/DemoHelpCallout'

interface Resident {
  id: string
  email: string | null
  full_name: string
  apartment_number: string | null
  role: string
  is_active: boolean
  has_account: boolean
  created_at: string
}

interface Apartment {
  id: string
  number: string
  owner_resident_id: string | null
}

interface ResidentForm {
  email: string
  password: string
  full_name: string
  apartment_number: string
  role: string
}

const emptyForm: ResidentForm = { email: '', password: '', full_name: '', apartment_number: '', role: 'resident' }

export default function ResidentsPage() {
  const { isAdmin, isAdminOrManager, loading: roleLoading } = useRole()
  const [residents, setResidents] = useState<Resident[]>([])
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ResidentForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [aptModalResident, setAptModalResident] = useState<Resident | null>(null)
  const [aptSelected, setAptSelected] = useState<string>('')
  const [aptBusy, setAptBusy] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { confirm } = useConfirm()

  const fetchResidents = async () => {
    const [{ data: resData }, { data: aptData }] = await Promise.all([
      supabase
        .from('residents')
        .select('id, email, full_name, apartment_number, role, is_active, has_account, created_at')
        .order('full_name', { ascending: true }),
      supabase
        .from('apartments')
        .select('id, number, owner_resident_id')
        .order('number', { ascending: true }),
    ])

    if (aptData) setApartments(aptData)

    if (resData && aptData) {
      const aptsByOwner: Record<string, string[]> = {}
      for (const a of aptData) {
        if (a.owner_resident_id) {
          aptsByOwner[a.owner_resident_id] = aptsByOwner[a.owner_resident_id] || []
          aptsByOwner[a.owner_resident_id].push(a.number)
        }
      }
      const sorted = [...resData].sort((a, b) => {
        const aNum = aptsByOwner[a.id]?.[0] ?? a.apartment_number ?? '\uffff'
        const bNum = aptsByOwner[b.id]?.[0] ?? b.apartment_number ?? '\uffff'
        const cmp = aNum.localeCompare(bNum, 'pl', { numeric: true })
        return cmp !== 0 ? cmp : a.full_name.localeCompare(b.full_name, 'pl')
      })
      setResidents(sorted)
    } else if (resData) {
      setResidents(resData)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchResidents()
  }, [])

  const apartmentsOf = (residentId: string) =>
    apartments.filter(a => a.owner_resident_id === residentId)

  const freeApartments = apartments.filter(a => !a.owner_resident_id)

  const openAptModal = (r: Resident) => {
    setAptModalResident(r)
    setAptSelected('')
  }

  const closeAptModal = () => {
    setAptModalResident(null)
    setAptSelected('')
  }

  const handleAssignApartment = async () => {
    if (!aptModalResident || !aptSelected) return
    setAptBusy(true)
    try {
      await api.post(`/residents/${aptModalResident.id}/apartments`, { apartment_id: aptSelected })
      await fetchResidents()
      setAptSelected('')
      toast('Lokal przypisany', 'success')
    } catch (err) {
      toast(formatCaughtError(err, 'Błąd przypisania lokalu'), 'error')
    }
    setAptBusy(false)
  }

  const handleUnassignApartment = async (apartmentId: string) => {
    if (!aptModalResident) return
    setAptBusy(true)
    try {
      await api.delete(`/residents/${aptModalResident.id}/apartments/${apartmentId}`)
      await fetchResidents()
      toast('Lokal odpięty', 'success')
    } catch (err) {
      toast(formatCaughtError(err, 'Błąd odpinania lokalu'), 'error')
    }
    setAptBusy(false)
  }

  useEffect(() => {
    if (showForm) {
      setTimeout(() => formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 50)
    }
  }, [showForm, editingId])

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
    setShowForm(true)
  }

  const openEdit = (r: Resident) => {
    setEditingId(r.id)
    setForm({
      email: r.email || '',
      password: '',
      full_name: r.full_name,
      apartment_number: r.apartment_number || '',
      role: r.role,
    })
    setError(null)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
  }

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      setError('Imię i nazwisko jest wymagane.')
      return
    }
    if (form.full_name.trim().length < 2) {
      setError('Imię i nazwisko musi mieć min. 2 znaki.')
      return
    }

    const email = form.email.trim()
    const editingResident = editingId ? residents.find(r => r.id === editingId) : null
    const grantingAccount = !!(editingResident && !editingResident.has_account && email)

    // Walidacja hasła: przy tworzeniu konta (email podany) i przy nadawaniu konta.
    const passwordRequired = !editingId ? !!email : grantingAccount
    if (passwordRequired) {
      if (!form.password || form.password.length < 8) {
        setError('Hasło musi mieć min. 8 znaków.')
        return
      }
      if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/\d/.test(form.password)) {
        setError('Hasło musi zawierać wielką literę, małą literę i cyfrę.')
        return
      }
    }

    setSaving(true)
    setError(null)

    try {
      if (editingId) {
        if (grantingAccount) {
          // Aktywacja konta (has_account: false → true) — email + hasło + ewentualnie inne pola.
          await api.patch(`/residents/${editingId}`, {
            email,
            password: form.password,
            full_name: form.full_name.trim(),
            apartment_number: form.apartment_number.trim() || null,
            role: form.role,
          })
        } else {
          // Zwykły update przez Supabase (RLS admin). Email niezmienialny.
          const { error: updateError } = await supabase
            .from('residents')
            .update({
              full_name: form.full_name.trim(),
              apartment_number: form.apartment_number.trim() || null,
              role: form.role,
            })
            .eq('id', editingId)

          if (updateError) {
            setError(mapSupabaseError(updateError))
            setSaving(false)
            return
          }
        }
      } else {
        // Create via FastAPI backend (uses service_role to create auth user).
        // Email + password opcjonalne — brak = mieszkaniec „bez konta" (rejestr do głosów z zebrania).
        const payload: Record<string, unknown> = {
          full_name: form.full_name.trim(),
          apartment_number: form.apartment_number.trim() || null,
          role: form.role,
        }
        if (email) {
          payload.email = email
          payload.password = form.password
        }
        await api.post('/residents', payload)
      }

      await fetchResidents()
      closeForm()
    } catch (err) {
      const msg = formatCaughtError(err, '')
      if (msg.toLowerCase().includes('already been registered') || msg.toLowerCase().includes('already registered')) {
        const existing = residents.find(r => (r.email ?? '').toLowerCase() === form.email.trim().toLowerCase())
        if (existing) {
          setError(`Konto z tym emailem już istnieje (${existing.full_name}). Aby dodać kolejny lokal, zamknij ten formularz i kliknij ikonę 🏠 przy wierszu tego mieszkańca.`)
        } else {
          setError('Konto z tym adresem email już istnieje. Znajdź tego mieszkańca na liście i kliknij ikonę 🏠 przy jego wierszu, aby przypisać kolejny lokal.')
        }
      } else {
        setError(formatCaughtError(err, 'Wystąpił błąd'))
      }
    }

    setSaving(false)
  }

  const handleDelete = async (r: Resident) => {
    const ok = await confirm({
      title: 'Usuń mieszkańca',
      message: `Czy na pewno chcesz usunąć "${r.full_name}"? Ta operacja jest nieodwracalna.`,
      confirmLabel: 'Usuń',
      danger: true,
    })
    if (!ok) return

    setDeleting(r.id)
    try {
      await api.delete(`/residents/${r.id}`)
      await fetchResidents()
      toast('Mieszkaniec został usunięty', 'success')
    } catch (err) {
      toast(formatCaughtError(err, 'Błąd usuwania'), 'error')
    }
    setDeleting(null)
  }

  const toggleActive = async (id: string, currentlyActive: boolean) => {
    await supabase
      .from('residents')
      .update({ is_active: !currentlyActive })
      .eq('id', id)

    await fetchResidents()
  }

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate">Ładowanie...</p>
      </div>
    )
  }

  if (!isAdminOrManager) {
    return <Navigate to="/admin" replace />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate">Ładowanie...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-charcoal">Mieszkańcy</h1>
        {isAdmin && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Dodaj
          </button>
        )}
      </div>

      <DemoHelpCallout>
        Lista osób z dostępem do panelu. W produkcji dodanie mieszkańca zakłada konto logowania i wysyła zaproszenie — w
        wersji demo operacje są tylko w pamięci przeglądarki.
      </DemoHelpCallout>

      {/* Form */}
      {isAdmin && showForm && (
        <div ref={formRef} className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-charcoal">
              {editingId ? 'Edytuj mieszkańca' : 'Nowy mieszkaniec'}
            </h2>
            <button onClick={closeForm} className="text-outline hover:text-charcoal">
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-error-container text-error text-sm rounded-[var(--radius-input)]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Imię i nazwisko *</label>
              <input
                type="text"
                maxLength={255}
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            {(() => {
              const editingResident = editingId ? residents.find(r => r.id === editingId) : null
              const isGrantAccountMode = editingResident ? !editingResident.has_account : false
              const emailDisabled = !!editingId && !isGrantAccountMode
              const emailLabel = editingId
                ? (isGrantAccountMode ? 'Email (nadaj konto)' : 'Email')
                : 'Email (opcjonalnie)'
              const showPasswordField = !editingId || isGrantAccountMode
              const passwordLabel = isGrantAccountMode ? 'Hasło (nadaj konto) *' : 'Hasło (wymagane gdy podany email)'
              return (
                <>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">{emailLabel}</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      disabled={emailDisabled}
                      placeholder={!editingId ? 'puste = mieszkaniec bez konta (tylko rejestr)' : ''}
                      className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage disabled:opacity-50 disabled:bg-cream"
                    />
                    {!editingId && (
                      <p className="text-xs text-outline mt-1">
                        Pozostaw puste, jeśli chcesz dodać właściciela do rejestru (np. do głosów z zebrania) bez zakładania konta logowania.
                      </p>
                    )}
                  </div>
                  {showPasswordField && (
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1">{passwordLabel}</label>
                      <input
                        type="password"
                        maxLength={128}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="min. 8 znaków, wielka/mała litera, cyfra"
                        className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
                      />
                    </div>
                  )}
                </>
              )
            })()}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Nr lokalu</label>
              <input
                type="text"
                maxLength={20}
                value={form.apartment_number}
                onChange={(e) => setForm({ ...form, apartment_number: e.target.value })}
                placeholder="np. 1, 2A"
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Rola</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              >
                <option value="resident">Mieszkaniec</option>
                <option value="manager">Zarządca</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={closeForm}
              className="px-4 py-2 text-sm font-medium text-slate hover:text-charcoal transition-colors"
            >
              Anuluj
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50"
            >
              {saving ? 'Zapisywanie...' : 'Zapisz'}
            </button>
          </div>
        </div>
      )}

      {/* Residents list */}
      {residents.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
          <p className="text-slate">Brak mieszkańców. Kliknij „Dodaj" aby utworzyć pierwszego.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-medium">
                  <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Imię i nazwisko</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Lokal</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Rola</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Status</th>
                  {isAdmin && <th className="text-right px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Akcje</th>}
                </tr>
              </thead>
              <tbody>
                {residents.map((r) => (
                  <tr key={r.id} className="border-b border-cream last:border-0 hover:bg-cream/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-charcoal">{r.full_name}</td>
                    <td className="px-5 py-3 text-slate">
                      {r.email ? (
                        r.email
                      ) : (
                        <span
                          className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-cream-deep text-outline"
                          title="Mieszkaniec w rejestrze bez konta logowania (np. do głosów z zebrania). Można nadać konto: edytuj i podaj email + hasło."
                        >
                          bez konta
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate">
                      {(() => {
                        const owned = apartmentsOf(r.id)
                        if (owned.length > 0) return owned.map(a => a.number).join(', ')
                        return r.apartment_number || '—'
                      })()}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        r.role === 'admin'
                          ? 'bg-amber-light text-amber'
                          : r.role === 'manager'
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-sage-pale/40 text-sage'
                      }`}>
                        {r.role === 'admin' ? 'Admin' : r.role === 'manager' ? 'Zarządca' : 'Mieszkaniec'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        r.is_active
                          ? 'bg-sage-pale/40 text-sage'
                          : 'bg-error-container text-error'
                      }`}>
                        {r.is_active ? 'Aktywny' : 'Nieaktywny'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openAptModal(r)}
                            className="p-1.5 text-outline hover:text-sage transition-colors"
                            title="Zarządzaj lokalami"
                          >
                            <HomeIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEdit(r)}
                            className="p-1.5 text-outline hover:text-sage transition-colors"
                            title="Edytuj"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleActive(r.id, r.is_active)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                              r.is_active
                                ? 'text-error hover:bg-error-container'
                                : 'text-sage hover:bg-sage-pale/40'
                            }`}
                          >
                            {r.is_active ? 'Dezaktywuj' : 'Aktywuj'}
                          </button>
                          <button
                            onClick={() => handleDelete(r)}
                            disabled={deleting === r.id}
                            className="p-1.5 text-outline hover:text-error transition-colors disabled:opacity-50"
                            title="Usuń"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Apartments modal */}
      {isAdmin && aptModalResident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4">
          <div className="bg-white rounded-[var(--radius-card)] shadow-ambient w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-charcoal">Lokale — {aptModalResident.full_name}</h2>
                <p className="text-xs text-outline mt-0.5">{aptModalResident.email}</p>
              </div>
              <button onClick={closeAptModal} className="text-outline hover:text-charcoal">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-5">
              <h3 className="text-sm font-medium text-charcoal mb-2">Przypisane lokale</h3>
              {apartmentsOf(aptModalResident.id).length === 0 ? (
                <p className="text-sm text-slate">Brak przypisanych lokali.</p>
              ) : (
                <ul className="space-y-1">
                  {apartmentsOf(aptModalResident.id).map(a => (
                    <li key={a.id} className="flex items-center justify-between px-3 py-2 bg-cream/50 rounded-[var(--radius-input)]">
                      <span className="text-sm text-charcoal">Lokal {a.number}</span>
                      <button
                        onClick={() => handleUnassignApartment(a.id)}
                        disabled={aptBusy}
                        className="text-xs text-error hover:underline disabled:opacity-50"
                      >
                        Odepnij
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-charcoal mb-2">Dodaj lokal</h3>
              {freeApartments.length === 0 ? (
                <p className="text-sm text-slate">Brak wolnych lokali.</p>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={aptSelected}
                    onChange={(e) => setAptSelected(e.target.value)}
                    className="flex-1 px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
                  >
                    <option value="">— wybierz lokal —</option>
                    {freeApartments.map(a => (
                      <option key={a.id} value={a.id}>Lokal {a.number}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignApartment}
                    disabled={!aptSelected || aptBusy}
                    className="px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50"
                  >
                    Przypisz
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={closeAptModal}
                className="px-4 py-2 text-sm font-medium text-slate hover:text-charcoal transition-colors"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
