import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { TrashIcon, MailIcon } from '../../components/ui/Icons'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { useRole } from '../../hooks/useRole'

interface ContactMessage {
  id: string
  name: string
  email: string
  apartment_number: string | null
  subject: string
  message: string
  is_read: boolean
  created_at: string
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { confirm } = useConfirm()
  const { toast } = useToast()
  const { isAdmin } = useRole()

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setMessages(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchMessages()
  }, [])

  const toggleExpand = async (msg: ContactMessage) => {
    if (expandedId === msg.id) {
      setExpandedId(null)
      return
    }

    setExpandedId(msg.id)

    if (!msg.is_read) {
      await supabase
        .from('contact_messages')
        .update({ is_read: true })
        .eq('id', msg.id)
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, is_read: true } : m))
      )
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Usuń wiadomość',
      message: 'Czy na pewno chcesz usunąć tę wiadomość?',
      confirmLabel: 'Usuń',
      danger: true,
    })
    if (!ok) return

    setDeleting(id)
    const { error } = await supabase.from('contact_messages').delete().eq('id', id)
    if (error) {
      toast('Nie udało się usunąć wiadomości.', 'error')
    } else {
      toast('Wiadomość usunięta.', 'success')
      if (expandedId === id) setExpandedId(null)
    }
    await fetchMessages()
    setDeleting(null)
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const unreadCount = messages.filter((m) => !m.is_read).length

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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-charcoal">Wiadomości</h1>
          {unreadCount > 0 && (
            <span className="px-2.5 py-0.5 bg-amber text-white text-xs font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-cream-medium flex items-center justify-center mx-auto mb-4">
            <MailIcon className="w-8 h-8 text-outline" />
          </div>
          <p className="text-slate">Brak wiadomości.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`bg-white rounded-[var(--radius-card)] shadow-ambient overflow-hidden transition-shadow ${
                !msg.is_read ? 'ring-1 ring-sage/30' : ''
              }`}
            >
              <button
                onClick={() => toggleExpand(msg)}
                className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-cream/50 transition-colors"
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    msg.is_read ? 'bg-cream-medium' : 'bg-sage'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm truncate ${msg.is_read ? 'text-charcoal' : 'font-semibold text-charcoal'}`}>
                      {msg.name}
                    </p>
                    {msg.apartment_number && (
                      <span className="text-xs text-outline shrink-0">lok. {msg.apartment_number}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate truncate mt-0.5">{msg.subject}</p>
                </div>
                <p className="text-xs text-outline shrink-0">{formatDate(msg.created_at)}</p>
              </button>

              {expandedId === msg.id && (
                <div className="px-5 pb-5 border-t border-cream-medium pt-4">
                  <div className="flex items-center gap-4 text-xs text-slate mb-3">
                    <span>Od: <a href={`mailto:${msg.email}`} className="text-sage hover:text-sage-light">{msg.email}</a></span>
                    {msg.apartment_number && <span>Lokal: {msg.apartment_number}</span>}
                    <span>Temat: {msg.subject}</span>
                  </div>
                  <p className="text-sm text-charcoal whitespace-pre-wrap">{msg.message}</p>
                  {isAdmin && (
                    <div className="flex justify-end mt-4">
                      <button
                        onClick={() => handleDelete(msg.id)}
                        disabled={deleting === msg.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-outline hover:text-error transition-colors disabled:opacity-50"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                        Usuń
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
