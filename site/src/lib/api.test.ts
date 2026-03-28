import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseApiError } from './api'
import { supabase } from './supabase'

// Global fetch mock
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('parseApiError', () => {
  it('zwraca string detail gdy detail jest stringiem', () => {
    expect(parseApiError({ detail: 'Zbyt wiele wiadomości' })).toBe('Zbyt wiele wiadomości')
  })

  it('zwraca komunikat o emailu gdy loc zawiera "email"', () => {
    const pydanticError = {
      detail: [
        {
          type: 'value_error',
          loc: ['body', 'email'],
          msg: 'value is not a valid email address',
          input: 'heya@wp',
        },
      ],
    }
    expect(parseApiError(pydanticError)).toBe('Podaj prawidłowy adres e-mail.')
  })

  it('zwraca ogólny komunikat gdy błąd Pydantic dotyczy innego pola', () => {
    const pydanticError = {
      detail: [
        {
          type: 'value_error',
          loc: ['body', 'message'],
          msg: 'String should have at least 10 characters',
          input: 'Hi',
        },
      ],
    }
    expect(parseApiError(pydanticError)).toBe('Sprawdź poprawność wypełnionych pól.')
  })

  it('zwraca fallback z kodem HTTP gdy brak detail', () => {
    expect(parseApiError({}, 500)).toBe('Błąd serwera (500)')
    expect(parseApiError(null, 422)).toBe('Błąd serwera (422)')
  })

  it('zwraca fallback bez kodu gdy brak statusu', () => {
    expect(parseApiError({})).toBe('Błąd serwera')
  })
})

describe('api client', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.resetModules()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function mockSession(token: string) {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: token } },
    } as ReturnType<typeof supabase.auth.getSession> extends Promise<infer R> ? R : never)
  }

  function mockFetchOk(body: unknown = {}) {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body),
    })
  }

  it('calls getSession and passes Bearer token', async () => {
    mockSession('test-token-123')
    mockFetchOk({ result: true })

    const { api } = await import('./api')
    const data = await api.get('/test')

    expect(supabase.auth.getSession).toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token-123',
        }),
      }),
    )
    expect(data).toEqual({ result: true })
  })

  it('throws when no session token', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
    } as ReturnType<typeof supabase.auth.getSession> extends Promise<infer R> ? R : never)

    const { api } = await import('./api')
    await expect(api.get('/test')).rejects.toThrow('Brak sesji')
  })

  it('throws on non-ok response with detail', async () => {
    mockSession('tok')
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ detail: 'Nieprawidłowe dane' }),
    })

    const { api } = await import('./api')
    await expect(api.post('/test', {})).rejects.toThrow('Nieprawidłowe dane')
  })

  it('throws czytelny komunikat przy błędzie walidacji Pydantic (detail jako tablica)', async () => {
    mockSession('tok')
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({
        detail: [{ type: 'value_error', loc: ['body', 'email'], msg: 'not valid', input: 'x' }],
      }),
    })

    const { api } = await import('./api')
    await expect(api.post('/test', {})).rejects.toThrow('Podaj prawidłowy adres e-mail.')
  })

  it('caches getSession across parallel requests', async () => {
    mockSession('tok')
    mockFetchOk()
    vi.mocked(supabase.auth.getSession).mockClear()

    const { api } = await import('./api')
    await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')])

    // getSession should be called only once thanks to caching
    expect(supabase.auth.getSession).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('refreshes session cache after timeout', async () => {
    mockSession('tok')
    mockFetchOk()
    vi.mocked(supabase.auth.getSession).mockClear()

    const { api } = await import('./api')
    await api.get('/first')
    expect(supabase.auth.getSession).toHaveBeenCalledTimes(1)

    // Advance past the 5s cache TTL
    await vi.advanceTimersByTimeAsync(6000)

    await api.get('/second')
    expect(supabase.auth.getSession).toHaveBeenCalledTimes(2)
  })

  it('sends correct method and body for POST/PATCH/DELETE', async () => {
    mockSession('tok')
    mockFetchOk()

    const { api } = await import('./api')

    await api.post('/p', { a: 1 })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/p'),
      expect.objectContaining({ method: 'POST', body: '{"a":1}' }),
    )

    await api.patch('/q', { b: 2 })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/q'),
      expect.objectContaining({ method: 'PATCH', body: '{"b":2}' }),
    )

    await api.delete('/r')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/r'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('przy 401 odświeża sesję i powtarza żądanie', async () => {
    vi.mocked(supabase.auth.getSession)
      .mockResolvedValueOnce({
        data: { session: { access_token: 'expired' } },
      } as ReturnType<typeof supabase.auth.getSession> extends Promise<infer R> ? R : never)
      .mockResolvedValueOnce({
        data: { session: { access_token: 'fresh' } },
      } as ReturnType<typeof supabase.auth.getSession> extends Promise<infer R> ? R : never)

    vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
      data: { session: { access_token: 'fresh' } },
      error: null,
    } as Awaited<ReturnType<typeof supabase.auth.refreshSession>>)

    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ detail: 'x' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      })

    const { api } = await import('./api')
    const data = await api.get('/retry-test')

    expect(supabase.auth.refreshSession).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch.mock.calls[1][1]?.headers).toMatchObject({
      Authorization: 'Bearer fresh',
    })
    expect(data).toEqual({ ok: true })
    expect(supabase.auth.signOut).not.toHaveBeenCalled()
  })

  it('przy 401 po nieudanym refresh wywołuje signOut', async () => {
    mockSession('tok')
    vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
      data: { session: null },
      error: new Error('refresh failed'),
    } as Awaited<ReturnType<typeof supabase.auth.refreshSession>>)

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ detail: 'Unauthorized' }),
    })

    const { api } = await import('./api')
    await expect(api.get('/fail')).rejects.toThrow()

    expect(supabase.auth.signOut).toHaveBeenCalled()
  })
})
