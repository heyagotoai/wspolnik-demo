import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { SearchIcon, ChevronDownIcon } from '../../components/ui/Icons'
import { useToast } from '../../components/ui/Toast'
import { DemoHelpCallout } from '../../demo/DemoHelpCallout'

interface AuditEntry {
  id: string
  user_id: string | null
  user_name: string
  action: string
  table_name: string
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}

interface AuditResponse {
  data: AuditEntry[]
  total: number
  page: number
  per_page: number
}

const TABLE_LABELS: Record<string, string> = {
  charges: 'Naliczenia',
  payments: 'Wpłaty',
  charge_rates: 'Stawki',
  bank_statements: 'Wyciągi bankowe',
  apartments: 'Lokale',
  votes: 'Głosy',
  resolutions: 'Uchwały',
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: 'Utworzenie', color: 'bg-sage-pale/40 text-sage' },
  update: { label: 'Zmiana', color: 'bg-amber-light text-amber' },
  delete: { label: 'Usunięcie', color: 'bg-error-container text-error' },
  generate: { label: 'Generowanie', color: 'bg-sage-pale/40 text-sage' },
  config_change: { label: 'Konfiguracja', color: 'bg-amber-light text-amber' },
  votes_reset: { label: 'Reset głosów', color: 'bg-error-container text-error' },
}

const TABLES = ['', 'charges', 'payments', 'charge_rates', 'bank_statements', 'apartments', 'votes']
const ACTIONS = ['', 'create', 'update', 'delete', 'generate', 'config_change', 'votes_reset']

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/** Human-readable summary of what changed */
function describeDiff(entry: AuditEntry): string {
  const { action, table_name, old_data, new_data } = entry

  if (action === 'votes_reset') {
    const votes = old_data?.votes
    const count = Array.isArray(votes) ? votes.length : '?'
    const reason = old_data?.reason === 'manual_reset' ? 'ręczny reset' : 'cofnięcie do szkicu'
    return `Usunięto ${count} głosów (${reason})`
  }

  if (action === 'create' && table_name === 'votes' && new_data) {
    const vote = new_data.vote as string
    const voteLabel = vote === 'za' ? 'Za' : vote === 'przeciw' ? 'Przeciw' : 'Wstrzymuje się'
    return `Oddano głos: ${voteLabel}`
  }

  if (action === 'delete' && table_name === 'votes' && old_data) {
    const vote = old_data.vote as string
    const voteLabel = vote === 'za' ? 'Za' : vote === 'przeciw' ? 'Przeciw' : 'Wstrzymuje się'
    return `Usunięto głos: ${voteLabel}`
  }

  if (action === 'create' && new_data) {
    if (table_name === 'charges') {
      const amount = new_data.amount ?? new_data.total_amount
      return amount ? `Naliczenie: ${amount} PLN` : 'Nowe naliczenie'
    }
    return 'Nowy wpis'
  }

  if (action === 'update' && old_data && new_data) {
    const changes: string[] = []
    for (const key of Object.keys(new_data)) {
      if (key === 'id' || key === 'created_at' || key === 'updated_at') continue
      const oldVal = old_data[key]
      const newVal = new_data[key]
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push(`${key}: ${formatValue(oldVal)} → ${formatValue(newVal)}`)
      }
    }
    return changes.length > 0 ? changes.join(', ') : 'Zmiana danych'
  }

  if (action === 'delete') {
    return 'Usunięto wpis'
  }

  if (action === 'generate') {
    return 'Automatyczne generowanie'
  }

  if (action === 'config_change') {
    return 'Zmiana konfiguracji'
  }

  return action
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'tak' : 'nie'
  return String(v)
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { toast } = useToast()

  // Filters
  const [tableFilter, setTableFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const perPage = 50

  const fetchLog = async (p = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(perPage) })
      if (tableFilter) params.set('table_name', tableFilter)
      if (actionFilter) params.set('action', actionFilter)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)

      const res = await api.get<AuditResponse>(`/audit?${params}`)
      setEntries(res.data)
      setTotal(res.total)
    } catch {
      toast('Błąd ładowania dziennika operacji', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    fetchLog(1)
  }, [tableFilter, actionFilter, dateFrom, dateTo])

  useEffect(() => {
    fetchLog()
  }, [page])

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-charcoal">Dziennik operacji</h1>

      <DemoHelpCallout>
        Rejestr zmian w wrażliwych miejscach (np. naliczenia, wpłaty, głosy). W produkcji zostaje na stałe do rozliczeń i
        kontroli — w demo widać to samo w postaci przykładowych wpisów.
      </DemoHelpCallout>

      {/* Filters */}
      <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-4">
        <div className="flex items-center gap-2 mb-3">
          <SearchIcon className="w-4 h-4 text-outline" />
          <span className="text-sm font-medium text-charcoal">Filtry</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="filter-table" className="block text-xs text-slate mb-1">Tabela</label>
            <select
              id="filter-table"
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
            >
              <option value="">Wszystkie</option>
              {TABLES.filter(Boolean).map((t) => (
                <option key={t} value={t}>{TABLE_LABELS[t] || t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-action" className="block text-xs text-slate mb-1">Akcja</label>
            <select
              id="filter-action"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
            >
              <option value="">Wszystkie</option>
              {ACTIONS.filter(Boolean).map((a) => (
                <option key={a} value={a}>{ACTION_LABELS[a]?.label || a}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-date-from" className="block text-xs text-slate mb-1">Od daty</label>
            <input
              id="filter-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
            />
          </div>
          <div>
            <label htmlFor="filter-date-to" className="block text-xs text-slate mb-1">Do daty</label>
            <input
              id="filter-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-cream-deep rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
            />
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-slate">
        {loading ? 'Ładowanie...' : `Znaleziono ${total} wpisów`}
        {totalPages > 1 && ` — strona ${page} z ${totalPages}`}
      </p>

      {/* Table */}
      <div className="bg-white rounded-[var(--radius-card)] shadow-ambient overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream text-left">
                <th className="px-4 py-3 font-medium text-slate">Data</th>
                <th className="px-4 py-3 font-medium text-slate">Kto</th>
                <th className="px-4 py-3 font-medium text-slate">Akcja</th>
                <th className="px-4 py-3 font-medium text-slate">Tabela</th>
                <th className="px-4 py-3 font-medium text-slate">Opis</th>
                <th className="px-4 py-3 font-medium text-slate w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-medium">
              {entries.map((e) => {
                const actionStyle = ACTION_LABELS[e.action] || { label: e.action, color: 'bg-cream text-slate' }
                const isExpanded = expandedId === e.id

                return (
                  <tr key={e.id} className="group">
                    <td className="px-4 py-3 text-xs text-slate whitespace-nowrap">
                      {formatDateTime(e.created_at)}
                    </td>
                    <td className="px-4 py-3 text-charcoal whitespace-nowrap">
                      {e.user_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${actionStyle.color}`}>
                        {actionStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-charcoal">
                      {TABLE_LABELS[e.table_name] || e.table_name}
                    </td>
                    <td className="px-4 py-3 text-slate max-w-xs truncate" title={describeDiff(e)}>
                      {describeDiff(e)}
                    </td>
                    <td className="px-4 py-3">
                      {(e.old_data || e.new_data) && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : e.id)}
                          className="p-1 text-outline hover:text-charcoal transition-colors"
                          title="Pokaż szczegóły"
                        >
                          <ChevronDownIcon className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {/* Expanded detail row — rendered separately for proper layout */}
              {entries.map((e) => {
                if (expandedId !== e.id) return null
                return (
                  <tr key={`${e.id}-detail`} className="bg-cream/50">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {e.old_data && (
                          <div>
                            <p className="font-medium text-slate mb-1">Poprzednie dane:</p>
                            <pre className="bg-white p-3 rounded-[var(--radius-input)] overflow-x-auto text-charcoal whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                              {JSON.stringify(e.old_data, null, 2)}
                            </pre>
                          </div>
                        )}
                        {e.new_data && (
                          <div>
                            <p className="font-medium text-slate mb-1">Nowe dane:</p>
                            <pre className="bg-white p-3 rounded-[var(--radius-input)] overflow-x-auto text-charcoal whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                              {JSON.stringify(e.new_data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                      {e.record_id && (
                        <p className="mt-2 text-xs text-outline">ID rekordu: {e.record_id}</p>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {entries.length === 0 && !loading && (
          <div className="p-8 text-center text-slate">Brak wpisów dla wybranych filtrów.</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm font-medium text-slate hover:text-charcoal disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Poprzednia
          </button>
          <span className="text-sm text-slate">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm font-medium text-slate hover:text-charcoal disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Następna
          </button>
        </div>
      )}
    </div>
  )
}
