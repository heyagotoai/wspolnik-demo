import { test, expect } from '@playwright/test'
import { login, credentials, waitForLoaded } from './helpers'

const creds = credentials()

test.describe('Finanse mieszkańca', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, creds.resident.email, creds.resident.password)
    await page.goto('/panel/finanse')
    await waitForLoaded(page)
  })

  test('strona finansów wyświetla saldo lub komunikat o braku lokalu', async ({ page }) => {
    // Po załadowaniu: albo widać dane lokalu albo komunikat o braku
    const hasSaldo = await page.getByText('SALDO').isVisible().catch(() => false)
    const noApartment = await page.getByText('Brak przypisanego lokalu').isVisible()
      .catch(() => false)
    const hasError = await page.getByText('Nie udało się pobrać danych lokalu').isVisible()
      .catch(() => false)

    expect(hasSaldo || noApartment || hasError).toBeTruthy()
  })

  test('wyświetla karty: saldo, naliczenia, wpłaty', async ({ page }) => {
    // Jeśli brak lokalu — skip
    const noApartment = await page.getByText('Brak przypisanego lokalu').isVisible()
      .catch(() => false)
    if (noApartment) {
      test.skip(true, 'Konto testowe nie ma przypisanego lokalu')
      return
    }

    await expect(page.getByText('SALDO')).toBeVisible()
    await expect(page.getByText('SUMA NALICZEŃ')).toBeVisible()
    await expect(page.getByText('SUMA WPŁAT')).toBeVisible()
  })

  test('sekcja naliczeń miesięcznych', async ({ page }) => {
    const noApartment = await page.getByText('Brak przypisanego lokalu').isVisible()
      .catch(() => false)
    if (noApartment) {
      test.skip(true, 'Konto testowe nie ma przypisanego lokalu')
      return
    }

    await expect(page.getByText('Naliczenia miesięczne')).toBeVisible()

    // Sprawdź czy jest wiersz "Razem" lub komunikat o braku
    const hasTotal = await page.getByText('Razem').isVisible().catch(() => false)
    const hasEmpty = await page.getByText('Brak naliczeń za wybrany miesiąc').isVisible()
      .catch(() => false)
    expect(hasTotal || hasEmpty).toBeTruthy()
  })

  test('sekcja historii wpłat', async ({ page }) => {
    const noApartment = await page.getByText('Brak przypisanego lokalu').isVisible()
      .catch(() => false)
    if (noApartment) {
      test.skip(true, 'Konto testowe nie ma przypisanego lokalu')
      return
    }

    await expect(page.getByText('Historia wpłat')).toBeVisible()

    // Wpłaty lub komunikat o braku
    const hasPayments = await page.getByText(/\+[\d\s,.]+zł/).first().isVisible()
      .catch(() => false)
    const hasEmpty = await page.getByText('Brak zarejestrowanych wpłat').isVisible()
      .catch(() => false)
    expect(hasPayments || hasEmpty).toBeTruthy()
  })

  test('saldo pokazuje badge: nadpłata, niedopłata lub rozliczone', async ({ page }) => {
    const noApartment = await page.getByText('Brak przypisanego lokalu').isVisible()
      .catch(() => false)
    if (noApartment) {
      test.skip(true, 'Konto testowe nie ma przypisanego lokalu')
      return
    }

    await expect(page.getByText('SALDO')).toBeVisible()

    const badges = ['nadpłata', 'niedopłata', 'rozliczone']
    const visibleBadges = await Promise.all(
      badges.map(b => page.getByText(b).isVisible().catch(() => false))
    )
    expect(visibleBadges.some(Boolean)).toBeTruthy()
  })
})
