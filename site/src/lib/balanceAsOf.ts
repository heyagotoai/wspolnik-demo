/**
 * Wylicza „Saldo na dzień" — najpóźniejszą datę spośród:
 *  - dat zaksięgowanych wpłat (tylko `confirmed_by_admin`),
 *  - globalnej daty ostatniego importu bankowego,
 *  - globalnej daty ostatniego importu xlsx.
 *
 * Daty wpłat są w formacie `YYYY-MM-DD` (DATE). Timestampy importów
 * (`TIMESTAMPTZ`) są przycinane do części kalendarzowej przed porównaniem,
 * aby nie mieszać godziny utworzenia rekordu z datą wpłaty.
 *
 * Zwraca `YYYY-MM-DD` lub `null`, gdy brak danych.
 */
export function computeBalanceAsOf(params: {
  paymentDates: Array<{ payment_date: string; confirmed_by_admin: boolean }>
  lastBankImportAt: string | null
  lastExcelImportAt: string | null
}): string | null {
  const { paymentDates, lastBankImportAt, lastExcelImportAt } = params
  const candidates: string[] = []

  for (const p of paymentDates) {
    if (p.confirmed_by_admin) candidates.push(p.payment_date)
  }
  if (lastBankImportAt) candidates.push(lastBankImportAt.substring(0, 10))
  if (lastExcelImportAt) candidates.push(lastExcelImportAt.substring(0, 10))

  if (candidates.length === 0) return null
  return candidates.reduce((a, b) => (a > b ? a : b))
}

/** `YYYY-MM-DD` → `DD-MM-YYYY`. */
export function formatBalanceAsOfDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${d}-${m}-${y}`
}
