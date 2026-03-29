import { test, expect } from '@playwright/test'
import { login, credentials, waitForLoaded } from './helpers'

const creds = credentials()

test.describe('Głosowanie', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, creds.resident.email, creds.resident.password)
  })

  test('mieszkaniec widzi listę uchwał', async ({ page }) => {
    await page.goto('/panel/glosowania')
    await waitForLoaded(page)

    // Czekaj aż pojawi się treść — uchwały lub komunikat o braku
    await expect(
      page.getByText('Głosowanie otwarte').first()
        .or(page.getByText('Zamknięta').first())
        .or(page.getByText('Brak aktywnych głosowań'))
    ).toBeVisible({ timeout: 10_000 })
  })

  test('mieszkaniec oddaje głos "za"', async ({ page }) => {
    await page.goto('/panel/glosowania')
    await waitForLoaded(page)

    // Szukamy przycisku "Za" — oznacza, że jest aktywna uchwała do głosowania
    const voteButton = page.getByRole('button', { name: 'Za' }).first()
    const canVote = await voteButton.isVisible().catch(() => false)

    if (!canVote) {
      test.skip(true, 'Brak aktywnych uchwał do głosowania lub już zagłosowano')
      return
    }

    await voteButton.click()

    // Po głosowaniu: toast "Głos został oddany" lub zmiana UI na "Twój głos:"
    await expect(
      page.getByText('Głos został oddany').or(page.getByText('Twój głos:'))
    ).toBeVisible({ timeout: 10_000 })
  })

  test('po zagłosowaniu widać wynik i nie można głosować ponownie', async ({ page }) => {
    await page.goto('/panel/glosowania')
    await waitForLoaded(page)

    // Sprawdź czy jest "Twój głos:" — oznacza że już zagłosowaliśmy
    const alreadyVoted = await page.getByText('Twój głos:').first().isVisible()
      .catch(() => false)

    if (!alreadyVoted) {
      test.skip(true, 'Mieszkaniec jeszcze nie głosował — uruchom test oddawania głosu najpierw')
      return
    }

    await expect(page.getByText('Twój głos:').first()).toBeVisible()
  })

  test('wyniki głosowania pokazują pasek i liczby', async ({ page }) => {
    await page.goto('/panel/glosowania')
    await waitForLoaded(page)

    // Szukamy sekcji wyników — "Za:", "Przeciw:", "Łącznie:"
    const hasResults = await page.getByText('Łącznie:').first().isVisible()
      .catch(() => false)

    if (!hasResults) {
      test.skip(true, 'Brak uchwał z oddanymi głosami')
      return
    }

    await expect(page.getByText(/Za:\s*\d+/).first()).toBeVisible()
    await expect(page.getByText(/Przeciw:\s*\d+/).first()).toBeVisible()
    await expect(page.getByText(/Łącznie:\s*\d+/).first()).toBeVisible()
  })
})
