/**
 * Tłumaczy błędy Supabase Auth (GoTrue) na komunikaty dla użytkownika końcowego.
 * Nie pokazujemy surowego message + status HTTP — tylko zrozumiały tekst po polsku.
 */
export function getLoginErrorMessage(error: Error): string {
  const msg = (error.message || '').toLowerCase()

  if (
    msg.includes('invalid login credentials') ||
    msg.includes('invalid credentials')
  ) {
    return 'Nieprawidłowy adres e-mail lub hasło. Sprawdź dane i spróbuj ponownie.'
  }

  if (msg.includes('email not confirmed')) {
    return 'Konto nie zostało jeszcze aktywowane. Sprawdź skrzynkę e-mail lub skontaktuj się z zarządcą.'
  }

  if (
    msg.includes('too many requests') ||
    msg.includes('rate limit') ||
    msg.includes('over_email_send_rate_limit') ||
    msg.includes('over_request_rate_limit')
  ) {
    return 'Zbyt wiele prób logowania. Odczekaj chwilę i spróbuj ponownie.'
  }

  if (msg.includes('user not found') || msg.includes('user does not exist')) {
    return 'Nie znaleziono konta dla podanego adresu e-mail.'
  }

  return 'Nie udało się zalogować. Spróbuj ponownie za chwilę lub skontaktuj się z zarządcą.'
}
