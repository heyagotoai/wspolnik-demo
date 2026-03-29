import { describe, it, expect } from 'vitest'
import { getLoginErrorMessage } from './authLoginErrors'

describe('getLoginErrorMessage', () => {
  it('mapuje Invalid login credentials na polski komunikat', () => {
    expect(getLoginErrorMessage(new Error('Invalid login credentials'))).toBe(
      'Nieprawidłowy adres e-mail lub hasło. Sprawdź dane i spróbuj ponownie.',
    )
  })

  it('mapuje rate limit', () => {
    expect(getLoginErrorMessage(new Error('Too many requests'))).toBe(
      'Zbyt wiele prób logowania. Odczekaj chwilę i spróbuj ponownie.',
    )
  })

  it('zwraca ogólny komunikat dla nieznanego błędu', () => {
    expect(getLoginErrorMessage(new Error('Something weird'))).toBe(
      'Nie udało się zalogować. Spróbuj ponownie za chwilę lub skontaktuj się z zarządcą.',
    )
  })
})
