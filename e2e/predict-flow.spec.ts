import { expect, test } from '@playwright/test'
import { E2E_ADMIN_PASSWORD, E2E_SLUG } from './constants'

const LEAGUE = `/${E2E_SLUG}`
const PLAYER_NAME = 'E2E Player'
const PLAYER_PIN = '4242'

test.describe('predict → submit → leaderboard', () => {
  test('player saves predictions and earns points after admin enters results', async ({ page }) => {
    await page.goto(`${LEAGUE}/predict`)
    await expect(page.getByRole('heading', { name: 'Select or Create Profile' })).toBeVisible({
      timeout: 15_000,
    })

    await page.getByPlaceholder('New participant').fill(PLAYER_NAME)
    await page.getByLabel('4-digit PIN for new profile').fill(PLAYER_PIN)
    await page.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByText('GROUP STAGE')).toBeVisible({ timeout: 15_000 })

    const firstMatch = page.locator('.match-card').first()
    const homeTeam = await firstMatch.locator('.predict-team-name').first().innerText()
    const awayTeam = await firstMatch.locator('.predict-team-name').last().innerText()

    await firstMatch.getByLabel(`${homeTeam} score`).fill('2')
    await firstMatch.getByLabel(`${awayTeam} score`).fill('1')
    await page.getByRole('button', { name: '💾 Save All Predictions' }).click()
    await expect(page.getByRole('button', { name: '✓ All Predictions Saved' })).toBeVisible({
      timeout: 15_000,
    })

    await page.goto(LEAGUE)
    await expect(page.getByRole('heading', { name: '🏆 Current Standings' })).toBeVisible()
    const playerRow = page.locator('.match-row').filter({ hasText: PLAYER_NAME })
    await expect(playerRow).toBeVisible()
    await expect(playerRow).toContainText('0 pts')

    await page.goto(`${LEAGUE}/admin`)
    await page.getByPlaceholder('League admin password').fill(E2E_ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Login' }).click()
    await expect(page.getByText('League Management')).toBeVisible({ timeout: 15_000 })

    const adminFirstMatch = page.locator('.match-card').first()
    await adminFirstMatch.getByLabel(`${homeTeam} score`).fill('2')
    await adminFirstMatch.getByLabel(`${awayTeam} score`).fill('1')
    await page.getByRole('button', { name: '💾 Save All Results' }).click()
    await expect(page.getByRole('button', { name: '✓ All Results Saved' })).toBeVisible({
      timeout: 15_000,
    })

    await page.goto(LEAGUE)
    await page.reload()
    await expect(page.locator('.match-row').filter({ hasText: PLAYER_NAME })).toContainText('3 pts', {
      timeout: 15_000,
    })
  })
})
