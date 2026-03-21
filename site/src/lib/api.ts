import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Brak sesji — zaloguj się ponownie')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.detail || `Błąd serwera (${response.status})`)
  }
  return response.json()
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE}${path}`, { headers })
    return handleResponse<T>(res)
  },

  async post<T>(path: string, body: unknown): Promise<T> {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    return handleResponse<T>(res)
  },

  async patch<T>(path: string, body: unknown): Promise<T> {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    })
    return handleResponse<T>(res)
  },

  async delete<T>(path: string): Promise<T> {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers,
    })
    return handleResponse<T>(res)
  },
}
