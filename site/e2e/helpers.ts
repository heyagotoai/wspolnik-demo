import { type Page, expect } from '@playwright/test'

/**
 * Logowanie przez formularz na /logowanie.
 * Po sukcesie czeka na przekierowanie do panelu.
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/logowanie')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Hasło').fill(password)
  await page.getByRole('button', { name: 'Zaloguj się' }).click()
  // Czekaj na przekierowanie — panel mieszkańca lub admina
  await expect(page).toHaveURL(/\/(panel|admin)/, { timeout: 15_000 })
  await acceptLegalConsentIfShown(page)
}

/** Gdy obowiązuje okno zgód RODO — zaznacza pola i przechodzi dalej. */
export async function acceptLegalConsentIfShown(page: Page) {
  const title = page.getByRole('heading', { name: /Dokumenty prawne/i })
  try {
    await title.waitFor({ state: 'visible', timeout: 8000 })
  } catch {
    return
  }
  const boxes = page.locator('input[type="checkbox"]')
  const n = await boxes.count()
  for (let i = 0; i < n; i++) {
    await boxes.nth(i).check()
  }
  await page.getByRole('button', { name: /Akceptuję i przechodzę dalej/i }).click()
  await expect(title).toBeHidden({ timeout: 15_000 })
}

/**
 * Czeka aż strona załaduje dane (zniknie "Ładowanie...").
 * Vercel serverless + Supabase mogą potrzebować kilku sekund.
 */
export async function waitForLoaded(page: Page, timeout = 20_000) {
  // Czekaj aż "Ładowanie..." zniknie (strona załadowała dane)
  await expect(page.getByText('Ładowanie...')).toBeHidden({ timeout })
}

/**
 * Pobiera dane logowania z env.
 */
export function credentials() {
  return {
    admin: {
      email: process.env.E2E_ADMIN_EMAIL || '',
      password: process.env.E2E_ADMIN_PASSWORD || '',
    },
    resident: {
      email: process.env.E2E_RESIDENT_EMAIL || '',
      password: process.env.E2E_RESIDENT_PASSWORD || '',
    },
  }
}
