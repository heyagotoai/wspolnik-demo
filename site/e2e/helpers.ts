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
