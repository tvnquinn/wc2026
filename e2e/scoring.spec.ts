import { expect, type Page, test } from '@playwright/test'
import { E2E_ADMIN_PASSWORD, E2E_SLUG } from './constants'

const LEAGUE = `/${E2E_SLUG}`
const PLAYER_PIN = '4242'

async function createPlayer(page: Page, playerName: string) {
  await page.goto(`${LEAGUE}/predict`)
  await expect(page.getByRole('heading', { name: 'Select or Create Profile' })).toBeVisible({
    timeout: 15_000,
  })

  await page.getByPlaceholder('New participant').fill(playerName)
  await page.getByLabel('4-digit PIN for new profile').fill(PLAYER_PIN)
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByText('GROUP STAGE')).toBeVisible({ timeout: 15_000 })
}

async function getFirstMatchCard(page: Page) {
  const matchCard = page.locator('.match-card').filter({ has: page.getByRole('spinbutton') }).first()
  await expect(matchCard).toBeVisible({ timeout: 15_000 })
  const homeTeam = await matchCard.locator('.predict-team-name').first().innerText()
  const awayTeam = await matchCard.locator('.predict-team-name').last().innerText()
  return { matchCard, homeTeam, awayTeam }
}

async function savePredictions(page: Page) {
  await page.getByRole('button', { name: '💾 Save All Predictions' }).click()
  await expect(page.getByRole('button', { name: '✓ All Predictions Saved' })).toBeVisible({
    timeout: 15_000,
  })
}

async function loginAdmin(page: Page) {
  await page.goto(`${LEAGUE}/admin`)
  await page.getByPlaceholder('League admin password').fill(E2E_ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.getByText('League Management')).toBeVisible({ timeout: 15_000 })
}

async function enterResultForMatch(
  page: Page,
  homeTeam: string,
  awayTeam: string,
  homeScore: string,
  awayScore: string
) {
  const adminMatch = page
    .locator('.match-card')
    .filter({ hasText: homeTeam })
    .filter({ hasText: awayTeam })
    .first()
  await expect(adminMatch).toBeVisible({ timeout: 15_000 })
  await adminMatch.getByLabel(`${homeTeam} score`).fill(homeScore)
  await adminMatch.getByLabel(`${awayTeam} score`).fill(awayScore)
  await adminMatch.getByRole('button', { name: 'Save result' }).click()
  await expect(adminMatch.getByRole('button', { name: '✓ Saved' })).toBeVisible({
    timeout: 15_000,
  })
}

async function expectStandingsPoints(page: Page, playerName: string, pointsLabel: string) {
  await page.goto(LEAGUE)
  await page.reload()
  await expect(
    page.locator('.standings-card').filter({ hasText: playerName }).locator('.standings-card-points')
  ).toContainText(pointsLabel, { timeout: 15_000 })
}

/**
 * E2E-4 (manual / integration — not automated):
 * The E2E league may not seed jackpot-eligible matches (M25+). Run these checks manually
 * against a league with full schedule data (e.g. sleepwell prod/staging):
 *
 * 1. Pot accumulates at kickoff: open /picks before and after kickoff; banner increments by stage amount.
 * 2. No payout until result entered: jackpot winnings unchanged while result is unset.
 * 3. Solo exact winner: enter exact result for one player; their jackpotWinnings increase by full pot.
 * 4. Simultaneous kickoffs: one match has solo winner, others have none → winner gets full pot.
 * 5. All simultaneous matches no winner: pot rolls over intact.
 * 6. Two winners same simultaneous match: pot stays (2+ winners = rollover).
 * 7. Jackpot starts at M25: M1–M24 do not affect pot or winnings.
 * 8. Result correction: admin changes result; jackpot winnings update on next page load.
 */
test.describe('scoring computation', () => {
  test('E2E-1 group correct outcome (not exact) earns 1 pt', async ({ page }) => {
    const playerName = 'E2E Scoring Outcome'

    await createPlayer(page, playerName)
    const { matchCard, homeTeam, awayTeam } = await getFirstMatchCard(page)
    await matchCard.getByLabel(`${homeTeam} score`).fill('3')
    await matchCard.getByLabel(`${awayTeam} score`).fill('0')
    await savePredictions(page)

    await loginAdmin(page)
    await enterResultForMatch(page, homeTeam, awayTeam, '2', '0')

    await expectStandingsPoints(page, playerName, '1 pts')
  })

  test('E2E-2 group wrong outcome earns 0 pts', async ({ page }) => {
    const playerName = 'E2E Scoring Wrong'

    await createPlayer(page, playerName)
    const { matchCard, homeTeam, awayTeam } = await getFirstMatchCard(page)
    await matchCard.getByLabel(`${homeTeam} score`).fill('2')
    await matchCard.getByLabel(`${awayTeam} score`).fill('1')
    await savePredictions(page)

    await loginAdmin(page)
    await enterResultForMatch(page, homeTeam, awayTeam, '0', '1')

    await expectStandingsPoints(page, playerName, '0 pts')
  })

  test('E2E-3 group exact score earns 3 pts (not 3+1)', async ({ page }) => {
    const playerName = 'E2E Scoring Exact'

    await createPlayer(page, playerName)
    const { matchCard, homeTeam, awayTeam } = await getFirstMatchCard(page)
    await matchCard.getByLabel(`${homeTeam} score`).fill('2')
    await matchCard.getByLabel(`${awayTeam} score`).fill('1')
    await savePredictions(page)

    await loginAdmin(page)
    await enterResultForMatch(page, homeTeam, awayTeam, '2', '1')

    await expectStandingsPoints(page, playerName, '3 pts')
  })
})
