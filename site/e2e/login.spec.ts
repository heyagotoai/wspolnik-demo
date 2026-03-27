import { test, expect } from '@playwright/test'
import { login, credentials } from './helpers'

const creds = credentials()

test.describe('Logowanie', () => {
  test('mieszkaniec loguje się i widzi panel', async ({ page }) => {
    await login(page, creds.resident.email, creds.resident.password)
    await expect(page).toHaveURL(/\/panel/)
    await expect(page.getByText('Witaj')).toBeVisible()
  })

  test('admin loguje się i widzi panel admina', async ({ page }) => {
    await login(page, creds.admin.email, creds.admin.password)
    await expect(page).toHaveURL(/\/(panel|admin)/)
  })

  test('błędne hasło — wyświetla komunikat o błędzie', async ({ page }) => {
    await page.goto('/logowanie')
    await page.getByLabel('Email').fill(creds.resident.email)
    await page.getByLabel('Hasło').fill('ZleHaslo!999')
    await page.getByRole('button', { name: 'Zaloguj się' }).click()

    // Czekaj na komunikat błędu (inline pod formularzem)
    await expect(page.locator('.bg-error-container')).toBeVisible({ timeout: 10_000 })
  })

  test('puste pola — przycisk nie wysyła formularza (walidacja HTML)', async ({ page }) => {
    await page.goto('/logowanie')
    await page.getByRole('button', { name: 'Zaloguj się' }).click()

    // Powinniśmy nadal być na stronie logowania
    await expect(page).toHaveURL(/\/logowanie/)
  })
})
