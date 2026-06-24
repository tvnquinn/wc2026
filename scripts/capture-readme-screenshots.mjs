/**
 * Capture README screenshots from local dev (/demo league).
 * Usage: npm run dev & node scripts/capture-readme-screenshots.mjs
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const base = process.argv[2] || 'http://localhost:3000'
const outDir = 'docs/screenshots'
const demo = `${base}/demo`
const VIEWPORT = { width: 1280, height: 900 }
const ROW_LIMIT = 6

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: VIEWPORT })

async function shot(path, url, { setup, clipHeight, hideExtraRows, rulesFirstSectionOnly } = {}) {
  await page.goto(url, { waitUntil: 'networkidle' })
  if (setup) await setup()

  if (hideExtraRows === 'predict') {
    await page.evaluate((limit) => {
      document.querySelectorAll('.match-card-list .match-card').forEach((el, i) => {
        if (i >= limit) el.style.display = 'none'
      })
    }, ROW_LIMIT)
  }

  if (hideExtraRows === 'admin') {
    await page.evaluate((limit) => {
      document.querySelectorAll('.predict-with-save-bar .match-card').forEach((el, i) => {
        if (i >= limit) el.style.display = 'none'
      })
    }, ROW_LIMIT)
  }

  if (hideExtraRows === 'predictions') {
    await page.evaluate((limit) => {
      document.querySelectorAll('.picks-grid tbody tr').forEach((el, i) => {
        if (i >= limit) el.style.display = 'none'
      })
    }, ROW_LIMIT)
  }

  if (rulesFirstSectionOnly) {
    await page.evaluate(() => {
      document.querySelectorAll('.rules-content').forEach((el, i) => {
        if (i > 0) el.style.display = 'none'
      })
    })
  }

  await page.evaluate(() => window.scrollTo(0, 0))

  let height = clipHeight
  if (clipHeight === 'save-bar') {
    height = await page.evaluate(() => {
      const bar = document.querySelector('.predict-save-bar')
      if (bar) {
        const rect = bar.getBoundingClientRect()
        return Math.ceil(rect.bottom + 20)
      }
      return 860
    })
  }

  if (height) {
    await page.screenshot({
      path,
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: Math.min(height, VIEWPORT.height) },
    })
  } else {
    await page.screenshot({ path, fullPage: true })
  }

  console.log(`Wrote ${path}`)
}

await shot(`${outDir}/landing.png`, `${base}/`)
await shot(`${outDir}/create.png`, `${base}/create`)

await shot(`${outDir}/predict-auth.png`, `${demo}/predict`, {
  setup: async () => {
    await page.locator('select').selectOption({ label: 'Alex' })
    await page.getByPlaceholder('Enter 4-digit PIN').fill('1234')
    await page.getByRole('button', { name: 'Unlock' }).click()
    await page.getByText('GROUP STAGE').waitFor({ timeout: 10000 })
  },
  hideExtraRows: 'predict',
  clipHeight: 'save-bar',
})

await shot(`${outDir}/admin-auth.png`, `${demo}/admin`, {
  setup: async () => {
    await page.locator('input[type="password"]').fill('demo')
    await page.getByRole('button', { name: 'Login' }).click()
    await page.getByText('League Management').waitFor({ timeout: 10000 })
  },
  hideExtraRows: 'admin',
  clipHeight: 'save-bar',
})

await shot(`${outDir}/leaderboard.png`, `${demo}`)
await shot(`${outDir}/predictions.png`, `${demo}/picks`, {
  hideExtraRows: 'predictions',
  clipHeight: 500,
})
await shot(`${outDir}/rules.png`, `${demo}/rules`, {
  rulesFirstSectionOnly: true,
  clipHeight: 420,
})

await browser.close()
