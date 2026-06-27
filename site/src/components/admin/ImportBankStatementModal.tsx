import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { XIcon } from '../ui/Icons'
import { parseApiError } from '../../lib/api'
import { formatCaughtError } from '../../lib/userFacingErrors'
import { isDemoApp } from '../../demo/isDemoApp'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

interface MatchedRow {
  apartment_number: string
  payment_date: string
  amount: string
  confidence: number
  match_details: string
}

interface UnmatchedRow {
  row_index: number
  payment_date: string | null
  amount: string | null
  sender_name: string
  description: string
  reason: string
}

interface ImportResult {
  dry_run: boolean
  total_rows: number
  matched_count: number
  unmatched_count: number
  manual_matched_count?: number
  matched: MatchedRow[]
  unmatched: UnmatchedRow[]
}

interface Apartment {
  id: string
  number: string
}

interface Props {
  onClose: () => void
  onSuccess: () => void
}

type Step = 'upload' | 'preview' | 'done'

async function callImportApi(
  file: File,
  dryRun: boolean,
  manualAssignments?: Record<number, string[]>,
): Promise<ImportResult> {
  if (isDemoApp()) {
    return {
      dry_run: dryRun,
      total_rows: 1,
      matched_count: 0,
      unmatched_count: 1,
      matched: [],
      unmatched: [
        {
          row_index: 2,
          payment_date: null,
          amount: null,
          sender_name: '—',
          description: 'Tryb demo — zestawienie bankowe nie jest przetwarzane.',
          reason: 'demo',
        },
      ],
    }
  }
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Brak sesji — zaloguj się ponownie')

  const formData = new FormData()
  formData.append('file', file)
  if (manualAssignments) {
    const filtered: Record<number, string[]> = {}
    for (const [k, v] of Object.entries(manualAssignments)) {
      if (Array.isArray(v) && v.length > 0) filtered[Number(k)] = v
    }
    if (Object.keys(filtered).length > 0) {
      formData.append('manual_assignments', JSON.stringify(filtered))
    }
  }

  const res = await fetch(`${API_BASE}/import/payments-bank-statement?dry_run=${dryRun}`, {
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

function confidenceLabel(c: number): { text: string; color: string } {
  if (c >= 0.85) return { text: 'Wysoka', color: 'text-sage' }
  if (c >= 0.6) return { text: 'Średnia', color: 'text-amber-600' }
  return { text: 'Niska', color: 'text-error' }
}

export default function ImportBankStatementModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportResult | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [manualAssignments, setManualAssignments] = useState<Record<number, string[]>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase
      .from('apartments')
      .select('id, number')
      .order('number', { ascending: true })
      .then(({ data }) => {
        if (data) setApartments(data as Apartment[])
      })
  }, [])

  const aptById = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of apartments) m.set(a.id, a.number)
    return m
  }, [apartments])

  const manualCount = useMemo(
    () => Object.values(manualAssignments).filter(arr => arr && arr.length > 0).length,
    [manualAssignments],
  )

  const addAssignment = (rowIndex: number, aptId: string) => {
    if (!aptId) return
    setManualAssignments(prev => {
      const cur = prev[rowIndex] || []
      if (cur.includes(aptId)) return prev
      return { ...prev, [rowIndex]: [...cur, aptId] }
    })
  }

  const removeAssignment = (rowIndex: number, aptId: string) => {
    setManualAssignments(prev => {
      const cur = prev[rowIndex] || []
      const next = cur.filter(id => id !== aptId)
      const copy = { ...prev }
      if (next.length === 0) delete copy[rowIndex]
      else copy[rowIndex] = next
      return copy
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setFile(f)
    setError(null)
  }

  const handlePreview = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setManualAssignments({})
    try {
      const res = await callImportApi(file, true)
      setPreview(res)
      setStep('preview')
    } catch (e) {
      setError(formatCaughtError(e, 'Wystąpił błąd'))
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await callImportApi(file, false, manualAssignments)
      setResult(res)
      setStep('done')
      onSuccess()
    } catch (e) {
      setError(formatCaughtError(e, 'Wystąpił błąd'))
    } finally {
      setLoading(false)
    }
  }

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-charcoal/40" onClick={onClose} />
      <div className="relative bg-white rounded-[var(--radius-card)] shadow-lg w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-cream-deep shrink-0">
          <h2 className="text-lg font-semibold text-charcoal">Import z zestawienia bankowego</h2>
          <button onClick={onClose} className="text-outline hover:text-charcoal">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">

          {step === 'upload' && (
            <>
              <p className="text-sm text-slate">
                Wgraj plik <strong className="text-charcoal">.xls</strong> pobrany z banku (zestawienie operacji).
                System automatycznie dopasuje wpłaty do lokali na podstawie nazwisk rozliczeniowych
                i numerów lokali w opisach przelewów.
              </p>
              <p className="text-sm text-slate bg-cream/80 rounded-[var(--radius-input)] px-3 py-2 border border-cream-deep">
                Przed importem upewnij się, że lokale mają uzupełnione <strong>nazwiska rozliczeniowe</strong> (edycja lokalu).
                Tylko wpłaty (kwota &gt; 0) są importowane. Transakcje bez dopasowania zostaną pokazane w podglądzie.
              </p>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Plik zestawienia (.xls)</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xls,application/vnd.ms-excel"
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
                  <p className="text-2xl font-bold text-sage">{preview.matched_count}</p>
                  <p className="text-xs text-slate mt-0.5">Dopasowanych</p>
                </div>
                <div className="bg-amber-50 rounded-[var(--radius-card)] p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{preview.unmatched_count}</p>
                  <p className="text-xs text-slate mt-0.5">Niedopasowanych</p>
                </div>
                <div className="bg-cream rounded-[var(--radius-card)] p-3 text-center">
                  <p className="text-2xl font-bold text-charcoal">{preview.total_rows}</p>
                  <p className="text-xs text-slate mt-0.5">Wierszy (wpłaty)</p>
                </div>
              </div>

              {preview.matched_count > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-charcoal mb-2">Dopasowane wpłaty</h3>
                  <div className="border border-cream-deep rounded-[var(--radius-card)] overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-cream border-b border-cream-deep">
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate">Lokal</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate">Data</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-slate">Kwota</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate">Pewność</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate">Źródło</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.matched.map((m, i) => {
                          const conf = confidenceLabel(m.confidence)
                          return (
                            <tr key={i} className="border-b border-cream-deep last:border-0">
                              <td className="px-3 py-2 text-charcoal font-medium">{m.apartment_number}</td>
                              <td className="px-3 py-2 text-charcoal">{m.payment_date}</td>
                              <td className="px-3 py-2 text-right text-charcoal">{parseFloat(m.amount).toFixed(2)} zł</td>
                              <td className={`px-3 py-2 text-xs font-medium ${conf.color}`}>{conf.text} ({Math.round(m.confidence * 100)}%)</td>
                              <td className="px-3 py-2 text-xs text-slate">{m.match_details}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {preview.unmatched_count > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-charcoal mb-2">Niedopasowane transakcje</h3>
                  <p className="text-xs text-slate mb-2">
                    Te wpłaty nie zostały dopasowane automatycznie. Możesz przypisać lokal ręcznie
                    — wybór jednego lokalu = całość kwoty, wybór kilku = rozbicie proporcjonalne (równe).
                  </p>
                  <div className="border border-cream-deep rounded-[var(--radius-card)] overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-cream border-b border-cream-deep">
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate w-12">Wiersz</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate">Nadawca / opis</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate w-24">Data</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-slate w-24">Kwota</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate">Przypisanie / powód</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.unmatched.map((u, i) => {
                          const assignable = u.row_index > 0 && !!u.payment_date && !!u.amount && parseFloat(u.amount) > 0
                          const selected = manualAssignments[u.row_index] || []
                          const available = apartments.filter(a => !selected.includes(a.id))
                          return (
                            <tr key={i} className="border-b border-cream-deep last:border-0 align-top">
                              <td className="px-3 py-2 text-xs text-outline">{u.row_index || '—'}</td>
                              <td className="px-3 py-2 text-charcoal text-xs">
                                <div className="font-medium">{u.sender_name || '—'}</div>
                                {u.description && (
                                  <div className="text-slate mt-0.5 break-words">{u.description}</div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-xs text-charcoal whitespace-nowrap">{u.payment_date || '—'}</td>
                              <td className="px-3 py-2 text-right text-charcoal whitespace-nowrap">{u.amount ? `${parseFloat(u.amount).toFixed(2)} zł` : '—'}</td>
                              <td className="px-3 py-2">
                                {assignable ? (
                                  <div className="space-y-1">
                                    {selected.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {selected.map(aid => (
                                          <span
                                            key={aid}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-sage/10 text-sage rounded-full text-xs font-medium"
                                          >
                                            Lokal {aptById.get(aid) || '?'}
                                            <button
                                              type="button"
                                              onClick={() => removeAssignment(u.row_index, aid)}
                                              className="hover:text-error"
                                              aria-label={`Usuń lokal ${aptById.get(aid) || ''}`}
                                            >
                                              ×
                                            </button>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    {available.length > 0 && (
                                      <select
                                        value=""
                                        onChange={e => {
                                          addAssignment(u.row_index, e.target.value)
                                          e.currentTarget.value = ''
                                        }}
                                        className="text-xs border border-cream-deep rounded-[var(--radius-input)] px-2 py-1 bg-white text-charcoal"
                                      >
                                        <option value="">+ przypisz lokal…</option>
                                        {available.map(a => (
                                          <option key={a.id} value={a.id}>Lokal {a.number}</option>
                                        ))}
                                      </select>
                                    )}
                                    {selected.length === 0 && (
                                      <div className="text-xs text-slate">{u.reason}</div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate">{u.reason}</div>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-sage/10 rounded-[var(--radius-card)] p-3 text-center">
                  <p className="text-2xl font-bold text-sage">{result.matched_count}</p>
                  <p className="text-xs text-slate mt-0.5">Zaimportowanych wpłat</p>
                  {(result.manual_matched_count ?? 0) > 0 && (
                    <p className="text-xs text-sage mt-1">
                      w tym <strong>{result.manual_matched_count}</strong> ręcznie przypisanych
                    </p>
                  )}
                </div>
                <div className="bg-amber-50 rounded-[var(--radius-card)] p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{result.unmatched_count}</p>
                  <p className="text-xs text-slate mt-0.5">Pominiętych (niedopasowanych)</p>
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
                onClick={() => { setStep('upload'); setPreview(null); setError(null); setManualAssignments({}) }}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-slate hover:text-charcoal transition-colors disabled:opacity-50"
              >
                ← Wróć
              </button>
              <button
                onClick={handleApply}
                disabled={loading || ((preview?.matched_count ?? 0) + manualCount) === 0}
                className="px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50"
              >
                {loading ? 'Importuję...' : `Zastosuj (${(preview?.matched_count ?? 0) + manualCount} wpłat)`}
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
