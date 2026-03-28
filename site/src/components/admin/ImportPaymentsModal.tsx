import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { XIcon } from '../ui/Icons'
import { parseApiError } from '../../lib/api'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

interface ImportRowResult {
  row: number
  apartment_number: string
  status: 'updated' | 'skipped' | 'error'
  message: string | null
}

interface ImportResult {
  dry_run: boolean
  rows_total: number
  updated: number
  skipped: number
  errors: number
  rows: ImportRowResult[]
}

interface Props {
  onClose: () => void
  onSuccess: () => void
}

type Step = 'upload' | 'preview' | 'done'

async function callImportPaymentsApi(file: File, dryRun: boolean): Promise<ImportResult> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Brak sesji — zaloguj się ponownie')

  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/import/payments?dry_run=${dryRun}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(parseApiError(body, res.status))
  }
  return res.json()
}

async function downloadPaymentsTemplate() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Brak sesji')

  const res = await fetch(`${API_BASE}/import/payments-template`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Nie udało się pobrać szablonu')

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'szablon_import_wplat.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}

const STATUS_LABEL: Record<string, string> = {
  updated: 'Zaimportowany',
  skipped: 'Pominięty',
  error: 'Błąd',
}

const STATUS_COLOR: Record<string, string> = {
  updated: 'text-sage font-medium',
  skipped: 'text-amber-600',
  error: 'text-error font-medium',
}

export default function ImportPaymentsModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportResult | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setFile(f)
    setError(null)
  }

  const handlePreview = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await callImportPaymentsApi(file, true)
      setPreview(res)
      setStep('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wystąpił błąd')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await callImportPaymentsApi(file, false)
      setResult(res)
      setStep('done')
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wystąpił błąd')
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateDownload = async () => {
    try {
      await downloadPaymentsTemplate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nie udało się pobrać szablonu')
    }
  }

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-charcoal/40" onClick={onClose} />
      <div className="relative bg-white rounded-[var(--radius-card)] shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-cream-deep shrink-0">
          <h2 className="text-lg font-semibold text-charcoal">Import wpłat z Excela</h2>
          <button onClick={onClose} className="text-outline hover:text-charcoal">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">

          {step === 'upload' && (
            <>
              <p className="text-sm text-slate">
                Arkusz <strong className="text-charcoal">Dopasowania</strong> (lub pierwszy arkusz): kolumny{' '}
                <span className="font-mono">Lokal</span>, <span className="font-mono">Data wpłaty</span>,{' '}
                <span className="font-mono">Kwota</span>. Dodatkowe kolumny (np. nazwisko) są ignorowane.
                Wiele dni księgowania: daty po średniku (np.{' '}
                <span className="font-mono">10.02.2026; 27.02.2026</span>).{' '}
                <strong>Jedna kwota</strong> (bez średnika w Kwota) = ta sama kwota na każdą datę (osobne wpłaty).{' '}
                <strong>Różne kwoty</strong>: ten sam układ po średniku w Kwota — pierwsza data z pierwszą kwotą, itd. (np.{' '}
                <span className="font-mono">341,20; 450,00</span>).
              </p>
              <p className="text-sm text-slate bg-cream/80 rounded-[var(--radius-input)] px-3 py-2 border border-cream-deep">
                Wiele lokali w jednym wierszu: tworzona jest wpłata zbiorcza + rozbicie na lokale (proporcje z naliczeń w miesiącu daty lub równo).
              </p>

              <button
                onClick={handleTemplateDownload}
                className="flex items-center gap-2 px-3 py-2 border border-sage text-sage text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage/10 transition-colors"
              >
                Pobierz szablon .xlsx
              </button>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Plik Excel (.xlsx)</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-slate file:mr-3 file:py-2 file:px-3 file:border file:border-cream-deep file:rounded-[var(--radius-button)] file:text-sm file:font-medium file:text-charcoal file:bg-cream hover:file:bg-cream-deep transition-colors"
                />
                {file && (
                  <p className="mt-1 text-xs text-slate">Wybrany: <span className="text-charcoal font-medium">{file.name}</span></p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-error-container text-error text-sm rounded-[var(--radius-input)]">{error}</div>
              )}
            </>
          )}

          {step === 'preview' && preview && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-sage/10 rounded-[var(--radius-card)] p-3 text-center">
                  <p className="text-2xl font-bold text-sage">{preview.updated}</p>
                  <p className="text-xs text-slate mt-0.5">Do zapisania</p>
                </div>
                <div className="bg-amber-50 rounded-[var(--radius-card)] p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{preview.skipped}</p>
                  <p className="text-xs text-slate mt-0.5">Pominiętych</p>
                </div>
                <div className={`${preview.errors > 0 ? 'bg-error-container' : 'bg-cream'} rounded-[var(--radius-card)] p-3 text-center`}>
                  <p className={`text-2xl font-bold ${preview.errors > 0 ? 'text-error' : 'text-outline'}`}>{preview.errors}</p>
                  <p className="text-xs text-slate mt-0.5">Błędów</p>
                </div>
              </div>

              {preview.errors > 0 && (
                <p className="text-sm text-error bg-error-container rounded-[var(--radius-card)] px-4 py-2">
                  Plik zawiera błędy. Popraw je przed zastosowaniem importu.
                </p>
              )}

              <div className="border border-cream-deep rounded-[var(--radius-card)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-cream border-b border-cream-deep">
                      <th className="text-left px-3 py-2 text-xs font-medium text-slate w-12">Wiersz</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-slate">Lokal</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-slate w-32">Status</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-slate">Informacja</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r) => (
                      <tr key={r.row} className="border-b border-cream-deep last:border-0">
                        <td className="px-3 py-2 text-xs text-outline">{r.row}</td>
                        <td className="px-3 py-2 text-charcoal">{r.apartment_number || '—'}</td>
                        <td className={`px-3 py-2 text-xs ${STATUS_COLOR[r.status] || ''}`}>
                          {STATUS_LABEL[r.status] || r.status}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate">{r.message || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && (
                <div className="p-3 bg-error-container text-error text-sm rounded-[var(--radius-input)]">{error}</div>
              )}
            </>
          )}

          {step === 'done' && result && (
            <>
              <div className="flex items-center gap-3">
                <span className="text-2xl">✓</span>
                <p className="font-semibold text-lg text-charcoal">Import zakończony</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-sage/10 rounded-[var(--radius-card)] p-3 text-center">
                  <p className="text-2xl font-bold text-sage">{result.updated}</p>
                  <p className="text-xs text-slate mt-0.5">Zapisanych wierszy</p>
                </div>
                <div className="bg-amber-50 rounded-[var(--radius-card)] p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{result.skipped}</p>
                  <p className="text-xs text-slate mt-0.5">Pominiętych</p>
                </div>
                <div className={`${result.errors > 0 ? 'bg-error-container' : 'bg-cream'} rounded-[var(--radius-card)] p-3 text-center`}>
                  <p className={`text-2xl font-bold ${result.errors > 0 ? 'text-error' : 'text-outline'}`}>{result.errors}</p>
                  <p className="text-xs text-slate mt-0.5">Błędów</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-cream-deep shrink-0 flex justify-between gap-3">
          {step === 'upload' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate hover:text-charcoal transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handlePreview}
                disabled={!file || loading}
                className="px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50"
              >
                {loading ? 'Analizuję...' : 'Analizuj plik'}
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => { setStep('upload'); setPreview(null); setError(null) }}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-slate hover:text-charcoal transition-colors disabled:opacity-50"
              >
                ← Wróć
              </button>
              <button
                onClick={handleApply}
                disabled={loading || (preview?.errors ?? 0) > 0 || (preview?.updated ?? 0) === 0}
                className="px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50"
              >
                {loading ? 'Importuję...' : `Zastosuj (${preview?.updated ?? 0} wierszy)`}
              </button>
            </>
          )}

          {step === 'done' && (
            <button
              onClick={onClose}
              className="ml-auto px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors"
            >
              Zamknij
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
