/**
 * Capture README screenshots from local dev (wc26-demo league).
 * Usage: npm run dev & node scripts/capture-readme-screenshots.mjs
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const base = process.argv[2] || 'http://localhost:3000'
const outDir = 'docs/screenshots'
const demo = `${base}/wc26-demo`

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

async function shot(path, url, setup) {
  await page.goto(url, { waitUntil: 'networkidle' })
  if (setup) await setup()
  await page.screenshot({ path, fullPage: true })
  console.log(`Wrote ${path}`)
}

await shot(`${outDir}/landing.png`, `${base}/`)
await shot(`${outDir}/create.png`, `${base}/create`)

await shot(`${outDir}/predict-auth.png`, `${demo}/predict`, async () => {
  await page.locator('select').selectOption({ label: 'Alex' })
  await page.getByPlaceholder('Enter 4-digit PIN').fill('1234')
  await page.getByRole('button', { name: 'Unlock' }).click()
  await page.getByText('GROUP STAGE').waitFor({ timeout: 10000 })
})

await shot(`${outDir}/admin-auth.png`, `${demo}/admin`, async () => {
  await page.locator('input[type="password"]').fill('demo')
  await page.getByRole('button', { name: 'Login' }).click()
  await page.getByText('League Management').waitFor({ timeout: 10000 })
})

await shot(`${outDir}/leaderboard.png`, `${demo}`)
await shot(`${outDir}/predictions.png`, `${demo}/picks`)
await shot(`${outDir}/rules.png`, `${demo}/rules`)

await browser.close()
