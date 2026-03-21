import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { PlusIcon, EditIcon, TrashIcon, XIcon } from '../../components/ui/Icons'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/ConfirmDialog'

interface Resident {
  id: string
  email: string
  full_name: string
  apartment_number: string | null
  role: string
  is_active: boolean
  created_at: string
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
  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ResidentForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { toast } = useToast()
  const { confirm } = useConfirm()

  const fetchResidents = async () => {
    const { data } = await supabase
      .from('residents')
      .select('id, email, full_name, apartment_number, role, is_active, created_at')
      .order('full_name', { ascending: true })

    if (data) setResidents(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchResidents()
  }, [])

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
    setShowForm(true)
  }

  const openEdit = (r: Resident) => {
    setEditingId(r.id)
    setForm({
      email: r.email,
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
    if (!form.full_name.trim() || !form.email.trim()) {
      setError('Imię i email są wymagane.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (editingId) {
        // Update via Supabase (RLS allows admin)
        const { error: updateError } = await supabase
          .from('residents')
          .update({
            full_name: form.full_name.trim(),
            apartment_number: form.apartment_number.trim() || null,
            role: form.role,
          })
          .eq('id', editingId)

        if (updateError) {
          setError(updateError.message)
          setSaving(false)
          return
        }
      } else {
        // Create via FastAPI backend (uses service_role to create auth user)
        if (!form.password || form.password.length < 6) {
          setError('Hasło musi mieć min. 6 znaków.')
          setSaving(false)
          return
        }

        await api.post('/residents', {
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim(),
          apartment_number: form.apartment_number.trim() || null,
          role: form.role,
        })
      }

      await fetchResidents()
      closeForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd')
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
      toast(err instanceof Error ? err.message : 'Błąd usuwania', 'error')
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

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate">Ładowanie...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-charcoal">Mieszkańcy</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Dodaj
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
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
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={!!editingId}
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage disabled:opacity-50 disabled:bg-cream"
              />
            </div>
            {!editingId && (
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Hasło *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="min. 6 znaków"
                  className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Nr lokalu</label>
              <input
                type="text"
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
                  <th className="text-right px-5 py-3 text-xs font-medium text-outline uppercase tracking-wide">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {residents.map((r) => (
                  <tr key={r.id} className="border-b border-cream last:border-0 hover:bg-cream/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-charcoal">{r.full_name}</td>
                    <td className="px-5 py-3 text-slate">{r.email}</td>
                    <td className="px-5 py-3 text-slate">{r.apartment_number || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        r.role === 'admin'
                          ? 'bg-amber-light text-amber'
                          : 'bg-sage-pale/40 text-sage'
                      }`}>
                        {r.role === 'admin' ? 'Admin' : 'Mieszkaniec'}
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
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
