import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { supabase } from './supabase'

// Global fetch mock
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

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
})
