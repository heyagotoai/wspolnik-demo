import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { FileIcon, DownloadIcon } from '../../components/ui/Icons'
import { useToast } from '../../components/ui/Toast'
import { DemoHelpCallout } from '../../demo/DemoHelpCallout'

interface Document {
  id: string
  name: string
  category: string
  file_path: string
  file_size: string | null
  is_public: boolean
  created_at: string
}

const categoryLabels: Record<string, string> = {
  regulamin: 'Regulaminy',
  protokol: 'Protokoły',
  formularz: 'Formularze',
  uchwala: 'Uchwały',
  sprawozdanie: 'Sprawozdania',
  inne: 'Inne',
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const { toast } = useToast()

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('documents')
        .select('id, name, category, file_path, file_size, is_public, created_at')
        .order('created_at', { ascending: false })

      if (data) setDocuments(data)
      setLoading(false)
    }
    fetch()
  }, [])

  const categories = ['all', ...new Set(documents.map((d) => d.category))]
  const filtered = filter === 'all' ? documents : documents.filter((d) => d.category === filter)

  const handleDownload = async (doc: Document) => {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 60)

    if (error || !data?.signedUrl) {
      toast('Nie udało się pobrać pliku.', 'error')
      return
    }
    window.open(data.signedUrl, '_blank')
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
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-charcoal">Dokumenty</h1>

      <DemoHelpCallout>
        Pliki udostępnione mieszkańcom (PDF). Pobieranie działa jak w docelowym systemie — tutaj z przykładową treścią.
      </DemoHelpCallout>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
              filter === cat
                ? 'bg-sage text-white'
                : 'bg-white text-slate hover:bg-cream-medium'
            }`}
          >
            {cat === 'all' ? 'Wszystkie' : categoryLabels[cat] || cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
          <p className="text-slate">Brak dokumentów w tej kategorii.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-[var(--radius-card)] shadow-ambient p-5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-[var(--radius-input)] bg-sage-pale/30 flex items-center justify-center text-sage shrink-0">
                  <FileIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-charcoal truncate">{doc.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-outline">{categoryLabels[doc.category] || doc.category}</span>
                    <span className="text-xs text-outline">·</span>
                    <span className="text-xs text-outline">{formatDate(doc.created_at)}</span>
                    {doc.file_size && (
                      <>
                        <span className="text-xs text-outline">·</span>
                        <span className="text-xs text-outline">{doc.file_size}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDownload(doc)}
                className="shrink-0 w-9 h-9 rounded-[var(--radius-input)] bg-sage-pale/30 flex items-center justify-center text-sage hover:bg-sage-pale transition-colors"
                title="Pobierz"
              >
                <DownloadIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
