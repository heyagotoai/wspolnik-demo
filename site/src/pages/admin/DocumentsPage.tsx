import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRole } from '../../hooks/useRole'
import { UploadIcon, TrashIcon, FileIcon, DownloadIcon } from '../../components/ui/Icons'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { mapSupabaseError } from '../../lib/userFacingErrors'

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

const categoryOptions = Object.entries(categoryLabels)

export default function AdminDocumentsPage() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [deleting, setDeleting] = useState<string | null>(null)
  const { confirm } = useConfirm()
  const { toast } = useToast()
  const { isAdmin } = useRole()

  // Upload form state
  const [showUpload, setShowUpload] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [uploadCategory, setUploadCategory] = useState('inne')
  const [uploadPublic, setUploadPublic] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from('documents')
      .select('id, name, category, file_path, file_size, is_public, created_at')
      .order('created_at', { ascending: false })

    if (data) setDocuments(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setError('Wybierz plik do przesłania.')
      return
    }

    if (!uploadName.trim()) {
      setError('Podaj nazwę dokumentu.')
      return
    }

    // Only allow PDF files
    if (file.type !== 'application/pdf') {
      setError('Dozwolone są tylko pliki PDF.')
      return
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError('Maksymalny rozmiar pliku to 10 MB.')
      return
    }

    setUploading(true)
    setError(null)

    const filePath = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (uploadError) {
      setError(mapSupabaseError(uploadError))
      setUploading(false)
      return
    }

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    const { error: insertError } = await supabase.from('documents').insert({
      name: uploadName.trim(),
      category: uploadCategory,
      file_path: filePath,
      file_size: formatSize(file.size),
      is_public: uploadPublic,
      uploaded_by: user?.id,
    })

    if (insertError) {
      setError(mapSupabaseError(insertError))
      setUploading(false)
      return
    }

    await fetchDocuments()
    setShowUpload(false)
    setUploadName('')
    setUploadCategory('inne')
    setUploadPublic(false)
    if (fileRef.current) fileRef.current.value = ''
    setUploading(false)
    toast('Dokument został przesłany.', 'success')
  }

  const handleDownload = async (doc: Document) => {
    const { data, error: signError } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 60)

    if (signError || !data?.signedUrl) {
      toast('Nie udało się pobrać pliku.', 'error')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  const togglePublic = async (doc: Document) => {
    const newPublic = !doc.is_public
    await supabase
      .from('documents')
      .update({ is_public: newPublic })
      .eq('id', doc.id)

    await fetchDocuments()
    toast(newPublic ? 'Dokument ustawiony jako publiczny.' : 'Dokument ustawiony jako prywatny.', 'info')
  }

  const handleDelete = async (doc: Document) => {
    const ok = await confirm({
      title: 'Usuń dokument',
      message: `Czy na pewno chcesz usunąć "${doc.name}"?`,
      confirmLabel: 'Usuń',
      danger: true,
    })
    if (!ok) return

    setDeleting(doc.id)

    // Delete from storage
    await supabase.storage.from('documents').remove([doc.file_path])

    // Delete from DB
    await supabase.from('documents').delete().eq('id', doc.id)

    await fetchDocuments()
    setDeleting(null)
    toast('Dokument został usunięty.', 'success')
  }

  const categories = ['all', ...new Set(documents.map((d) => d.category))]
  const filtered = filter === 'all' ? documents : documents.filter((d) => d.category === filter)

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
        <h1 className="text-2xl font-bold text-charcoal">Dokumenty</h1>
        {isAdmin && (
          <button
            onClick={() => { setShowUpload(!showUpload); setError(null) }}
            className="flex items-center gap-2 px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors"
          >
            <UploadIcon className="w-4 h-4" />
            Dodaj dokument
          </button>
        )}
      </div>

      {/* Upload form — admin only */}
      {isAdmin && showUpload && (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
          <h2 className="text-lg font-semibold text-charcoal mb-4">Nowy dokument</h2>

          {error && (
            <div className="mb-4 p-3 bg-error-container text-error text-sm rounded-[var(--radius-input)]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Nazwa dokumentu *</label>
              <input
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Kategoria</label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              >
                {categoryOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Plik PDF *</label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                className="w-full text-sm text-slate file:mr-4 file:py-2 file:px-4 file:rounded-[var(--radius-button)] file:border-0 file:text-sm file:font-medium file:bg-sage-pale/30 file:text-sage hover:file:bg-sage-pale"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={uploadPublic}
                  onChange={(e) => setUploadPublic(e.target.checked)}
                  className="w-4 h-4 rounded border-cream-deep text-sage focus:ring-sage/30"
                />
                <span className="text-sm text-charcoal">Publiczny (widoczny bez logowania)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => { setShowUpload(false); setError(null) }}
              className="px-4 py-2 text-sm font-medium text-slate hover:text-charcoal transition-colors"
            >
              Anuluj
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50"
            >
              {uploading ? 'Przesyłanie...' : 'Prześlij'}
            </button>
          </div>
        </div>
      )}

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

      {/* Documents list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
          <p className="text-slate">Brak dokumentów{filter !== 'all' ? ' w tej kategorii' : ''}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => (
            <div key={doc.id} className="bg-white rounded-[var(--radius-card)] shadow-ambient p-5 flex items-center justify-between gap-4">
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

              <div className="flex items-center gap-2 shrink-0">
                {isAdmin && (
                  <button
                    onClick={() => togglePublic(doc)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                      doc.is_public
                        ? 'bg-sage-pale/40 text-sage hover:bg-sage-pale'
                        : 'bg-cream-medium text-outline hover:bg-cream-deep'
                    }`}
                    title={doc.is_public ? 'Kliknij aby ustawić jako prywatny' : 'Kliknij aby ustawić jako publiczny'}
                  >
                    {doc.is_public ? 'Publiczny' : 'Prywatny'}
                  </button>
                )}
                {!isAdmin && (
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    doc.is_public ? 'bg-sage-pale/40 text-sage' : 'bg-cream-medium text-outline'
                  }`}>
                    {doc.is_public ? 'Publiczny' : 'Prywatny'}
                  </span>
                )}
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-2 text-outline hover:text-sage transition-colors"
                  title="Pobierz"
                >
                  <DownloadIcon className="w-4 h-4" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(doc)}
                    disabled={deleting === doc.id}
                    className="p-2 text-outline hover:text-error transition-colors disabled:opacity-50"
                    title="Usuń"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
