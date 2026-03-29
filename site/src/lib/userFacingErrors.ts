/**
 * Jednolite komunikaty dla użytkownika końcowego (błędy API, sieci, Supabase PostgREST).
 */

const NETWORK_RE =
  /failed to fetch|load failed|networkerror|network request failed|aborted|timed out|timeout/i

/**
 * Błąd z bloku catch przy wywołaniach fetch / api — mapuje typowe komunikaty przeglądarki na PL.
 * Komunikaty z {@link parseApiError} przechodzą bez zmian (są już po polsku lub z backendu).
 */
export function formatCaughtError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback
  if (NETWORK_RE.test(err.message)) {
    return 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.'
  }
  return err.message
}

/**
 * Błędy Supabase `.from().insert/update/...` — surowy `message` bywa po angielsku (PostgreSQL).
 */
export function mapSupabaseError(err: { message: string; code?: string }): string {
  const code = err.code ?? ''
  const m = (err.message || '').toLowerCase()

  if (code === '23505' || m.includes('duplicate key')) {
    return 'Taki wpis już istnieje (np. powielona wartość w unikalnym polu).'
  }
  if (code === '23503' || m.includes('foreign key')) {
    return 'Nie można zapisać — powiązany rekord nie istnieje lub jest używany.'
  }
  if (code === '42501' || m.includes('row-level security') || m.includes('permission denied')) {
    return 'Brak uprawnień do tej operacji.'
  }
  if ((m.includes('jwt') && m.includes('expired')) || m.includes('jwt expired')) {
    return 'Sesja wygasła — odśwież stronę i zaloguj się ponownie.'
  }
  return 'Nie udało się zapisać zmian. Spróbuj ponownie lub skontaktuj się z administratorem.'
}
