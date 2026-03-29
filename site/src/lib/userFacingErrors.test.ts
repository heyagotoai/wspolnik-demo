import { describe, it, expect } from 'vitest'
import { formatCaughtError, mapSupabaseError } from './userFacingErrors'

describe('formatCaughtError', () => {
  it('mapuje typowy błąd sieci przeglądarki', () => {
    expect(formatCaughtError(new Error('Failed to fetch'), 'fallback')).toBe(
      'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.',
    )
  })

  it('przepuszcza komunikat z API (parseApiError)', () => {
    expect(formatCaughtError(new Error('Zbyt wiele wiadomości'), 'fallback')).toBe(
      'Zbyt wiele wiadomości',
    )
  })

  it('używa fallback dla nie-Error', () => {
    expect(formatCaughtError(null, 'Domyślny')).toBe('Domyślny')
  })
})

describe('mapSupabaseError', () => {
  it('mapuje duplikat klucza', () => {
    expect(
      mapSupabaseError({
        message: 'duplicate key value violates unique constraint',
        code: '23505',
      }),
    ).toMatch(/Taki wpis już istnieje/)
  })

  it('zwraca ogólny komunikat dla nieznanego błędu', () => {
    expect(mapSupabaseError({ message: 'xyz unknown' })).toMatch(/Nie udało się zapisać/)
  })
})
