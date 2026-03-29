import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

let _headersPromise: Promise<Record<string, string>> | null = null

/** Równoległe 401 z jednego burstu — jedno odświeżenie tokenu zamiast wielu wywołań. */
let _refreshInFlight: ReturnType<typeof supabase.auth.refreshSession> | null = null

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (_headersPromise) return _headersPromise
  _headersPromise = (async () => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('Brak sesji — zaloguj się ponownie')
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  })()
  // On success: cache for 5s then refresh. On error: clear immediately so next call retries.
  _headersPromise.then(
    () => setTimeout(() => { _headersPromise = null }, 5000),
    () => { _headersPromise = null },
  )
  return _headersPromise
}

async function refreshSessionDeduped() {
  if (!_refreshInFlight) {
    _refreshInFlight = supabase.auth.refreshSession().finally(() => {
      _refreshInFlight = null
    })
  }
  return _refreshInFlight
}

/** Po 401: odśwież sesję i powtórz raz (wygasły access_token vs natychmiastowe wylogowanie). */
async function fetchWithAuthRetry(execute: () => Promise<Response>): Promise<Response> {
  let res = await execute()
  if (res.status !== 401) return res

  _headersPromise = null
  const { data, error } = await refreshSessionDeduped()
  if (data.session?.access_token && !error) {
    res = await execute()
  }
  return res
}

export function parseApiError(body: unknown, status?: number): string {
  if (typeof body === 'object' && body !== null) {
    const { detail } = body as Record<string, unknown>
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as Record<string, unknown>
      const loc = Array.isArray(first.loc) ? first.loc : []
      if (loc.includes('email')) return 'Podaj prawidłowy adres e-mail.'
      return 'Sprawdź poprawność wypełnionych pól.'
    }
  }
  if (status === 503 || status === 502) {
    return 'Serwis jest chwilowo niedostępny. Spróbuj ponownie za chwilę.'
  }
  if (status === 429) {
    return 'Zbyt wiele żądań. Odczekaj chwilę i spróbuj ponownie.'
  }
  return 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie za chwilę.'
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      _headersPromise = null
      sessionStorage.setItem('session_expired', '1')
      supabase.auth.signOut()
    }
    const body = await response.json().catch(() => ({}))
    throw new Error(parseApiError(body, response.status))
  }
  return response.json()
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await fetchWithAuthRetry(async () => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE}${path}`, { headers })
    })
    return handleResponse<T>(res)
  },

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetchWithAuthRetry(async () => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
    })
    return handleResponse<T>(res)
  },

  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetchWithAuthRetry(async () => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE}${path}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      })
    })
    return handleResponse<T>(res)
  },

  async delete<T>(path: string): Promise<T> {
    const res = await fetchWithAuthRetry(async () => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE}${path}`, {
        method: 'DELETE',
        headers,
      })
    })
    return handleResponse<T>(res)
  },

  async getBlob(path: string): Promise<Blob> {
    const res = await fetchWithAuthRetry(async () => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE}${path}`, { headers })
    })
    if (!res.ok) {
      if (res.status === 401) {
        _headersPromise = null
        sessionStorage.setItem('session_expired', '1')
        supabase.auth.signOut()
      }
      const body = await res.json().catch(() => ({}))
      throw new Error(parseApiError(body, res.status))
    }
    return res.blob()
  },
}
