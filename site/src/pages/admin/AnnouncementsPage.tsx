import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { PlusIcon, EditIcon, TrashIcon, XIcon } from '../../components/ui/Icons'
import { useConfirm } from '../../components/ui/ConfirmDialog'

interface Announcement {
  id: string
  title: string
  content: string
  excerpt: string | null
  is_pinned: boolean
  created_at: string
}

interface AnnouncementForm {
  title: string
  content: string
  excerpt: string
  is_pinned: boolean
}

const emptyForm: AnnouncementForm = { title: '', content: '', excerpt: '', is_pinned: false }

export default function AdminAnnouncementsPage() {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AnnouncementForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { confirm } = useConfirm()

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('id, title, content, excerpt, is_pinned, created_at')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (data) setAnnouncements(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
    setShowForm(true)
  }

  const openEdit = (a: Announcement) => {
    setEditingId(a.id)
    setForm({
      title: a.title,
      content: a.content,
      excerpt: a.excerpt || '',
      is_pinned: a.is_pinned,
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
    if (!form.title.trim() || !form.content.trim()) {
      setError('Tytuł i treść są wymagane.')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      excerpt: form.excerpt.trim() || null,
      is_pinned: form.is_pinned,
    }

    if (editingId) {
      const { error: updateError } = await supabase
        .from('announcements')
        .update(payload)
        .eq('id', editingId)

      if (updateError) {
        setError(updateError.message)
        setSaving(false)
        return
      }
    } else {
      const { error: insertError } = await supabase
        .from('announcements')
        .insert({ ...payload, author_id: user?.id })

      if (insertError) {
        setError(insertError.message)
        setSaving(false)
        return
      }
    }

    await fetchAnnouncements()
    closeForm()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Usuń ogłoszenie',
      message: 'Czy na pewno chcesz usunąć to ogłoszenie?',
      confirmLabel: 'Usuń',
      danger: true,
    })
    if (!ok) return

    setDeleting(id)
    await supabase.from('announcements').delete().eq('id', id)
    await fetchAnnouncements()
    setDeleting(null)
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
        <h1 className="text-2xl font-bold text-charcoal">Ogłoszenia</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Dodaj ogłoszenie
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-charcoal">
              {editingId ? 'Edytuj ogłoszenie' : 'Nowe ogłoszenie'}
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

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Tytuł *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Treść *</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage resize-y"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Skrót (opcjonalnie)</label>
              <input
                type="text"
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                placeholder="Krótki opis widoczny na liście"
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_pinned}
                onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
                className="w-4 h-4 rounded border-cream-deep text-sage focus:ring-sage/30"
              />
              <span className="text-sm text-charcoal">Przypnij na górze (ważne)</span>
            </label>
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
              {saving ? 'Zapisywanie...' : editingId ? 'Zapisz zmiany' : 'Opublikuj'}
            </button>
          </div>
        </div>
      )}

      {/* Announcements list */}
      {announcements.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
          <p className="text-slate">Brak ogłoszeń. Dodaj pierwsze ogłoszenie.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white rounded-[var(--radius-card)] shadow-ambient p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {a.is_pinned && (
                      <span className="px-2 py-0.5 bg-amber-light text-amber text-xs font-medium rounded-full shrink-0">
                        Ważne
                      </span>
                    )}
                    <span className="text-xs text-outline">{formatDate(a.created_at)}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-charcoal">{a.title}</h3>
                  <p className="text-sm text-slate mt-1 line-clamp-2">
                    {a.excerpt || a.content.slice(0, 150)}{a.content.length > 150 ? '...' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(a)}
                    className="p-2 text-outline hover:text-sage transition-colors"
                    title="Edytuj"
                  >
                    <EditIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    disabled={deleting === a.id}
                    className="p-2 text-outline hover:text-error transition-colors disabled:opacity-50"
                    title="Usuń"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
