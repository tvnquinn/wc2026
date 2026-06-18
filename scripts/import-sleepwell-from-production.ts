/**
 * Import sleepwell league users + predictions from the live production picks page.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/import-sleepwell-from-production.ts
 *   npx tsx scripts/import-sleepwell-from-production.ts --url https://wc26pool.vercel.app
 */
import { PrismaClient } from '@prisma/client'
import { hashPin } from '../src/lib/auth'
import { ensureDefaultLeague } from '../src/lib/ensureDefaultLeague'
import { parseProdPicksPage } from '../src/lib/parseProdPicksPage'
import { recalculatePointsForMatch } from '../src/lib/recalculatePoints'
import { seedGlobalMatches } from '../src/lib/seedMatches'

const prisma = new PrismaClient()

const SLEEPWELL_SLUG = 'sleepwell'
const DEFAULT_PIN = '1234'
const DEFAULT_BASE = 'https://wc26pool.vercel.app'

type ParsedRow = {
  stage: string
  matchLabel: string
  homeTeam: string
  awayTeam: string
  result: string
  picks: { userName: string; score: string }[]
}

type ParsedScore = {
  home: number
  away: number
  pkHome: number | null
  pkAway: number | null
}

function parseArgs() {
  const urlIdx = process.argv.indexOf('--url')
  const base = urlIdx >= 0 ? process.argv[urlIdx + 1] : DEFAULT_BASE
  return base.replace(/\/$/, '')
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function parseMatchTeams(label: string): { home: string; away: string } | null {
  const normalized = label.trim()
  const parts = normalized.split(/\s+[-–—]\s+/)
  if (parts.length >= 2) {
    return { home: parts[0].trim(), away: parts.slice(1).join(' - ').trim() }
  }
  return null
}

function parseScore(text: string): ParsedScore | null {
  const trimmed = text.trim()
  if (!trimmed || trimmed === '-' || trimmed === '—') return null

  const pk = trimmed.match(/^(\d+)-(\d+)\s*\((\d+)-(\d+)(?:\s*PK)?\)$/i)
  if (pk) {
    return {
      home: parseInt(pk[1], 10),
      away: parseInt(pk[2], 10),
      pkHome: parseInt(pk[3], 10),
      pkAway: parseInt(pk[4], 10),
    }
  }

  const reg = trimmed.match(/^(\d+)-(\d+)$/)
  if (reg) {
    return {
      home: parseInt(reg[1], 10),
      away: parseInt(reg[2], 10),
      pkHome: null,
      pkAway: null,
    }
  }

  return null
}

function normalizeTeam(name: string): string {
  return name.trim().toLowerCase()
}

function parsePicksHtml(html: string): ParsedRow[] {
  const rows: ParsedRow[] = []
  const trMatches = html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)

  let headers: string[] | null = null

  for (const tr of trMatches) {
    const cellMatches = [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
    const cells = cellMatches.map((m) => decodeHtml(m[1].replace(/<[^>]+>/g, '').trim()))

    if (cells.length < 3) continue

    if (!headers) {
      if (cells[0].toLowerCase() === 'stage') {
        headers = cells
      }
      continue
    }

    const stage = cells[0]
    const matchLabel = cells[1]
    const result = cells[2]
    const userNames = headers.slice(3)
    const picks = userNames.map((userName, i) => ({
      userName,
      score: cells[3 + i] ?? '',
    }))

    const teams = parseMatchTeams(matchLabel)
    if (!teams) continue

    rows.push({
      stage,
      matchLabel,
      homeTeam: teams.home,
      awayTeam: teams.away,
      result,
      picks,
    })
  }

  if (!headers) {
    throw new Error('Could not find picks table header row on production page')
  }

  return rows
}

async function fetchProductionPicks(baseUrl: string): Promise<ParsedRow[]> {
  const url = `${baseUrl}/${SLEEPWELL_SLUG}/picks`
  console.log(`Fetching ${url} ...`)
  const res = await fetch(url, { headers: { Accept: 'text/html' } })
  if (!res.ok) {
    throw new Error(`Failed to fetch picks page: ${res.status} ${res.statusText}`)
  }
  const html = await res.text()
  const rows = parsePicksHtml(html)
  console.log(`Parsed ${rows.length} match rows, ${rows[0]?.picks.length ?? 0} users`)
  return rows
}

async function fetchProductionData(baseUrl: string) {
  const url = `${baseUrl}/${SLEEPWELL_SLUG}/picks`
  console.log(`Fetching ${url} ...`)
  const res = await fetch(url, { headers: { Accept: 'text/html' } })
  if (!res.ok) {
    throw new Error(`Failed to fetch picks page: ${res.status} ${res.statusText}`)
  }
  const html = await res.text()
  const parsed = parseProdPicksPage(html)
  if (parsed.users.length === 0) {
    throw new Error('No users found on production picks page (RSC parse)')
  }
  console.log(
    `Parsed ${parsed.users.length} users, ${parsed.matches.length} matches, ${parsed.predictions.length} predictions`
  )
  return parsed
}

async function main() {
  const baseUrl = parseArgs()
  const prod = await fetchProductionData(baseUrl)

  await ensureDefaultLeague()
  await seedGlobalMatches()

  // Wipe stale local results so only production-entered scores stay finished.
  await prisma.match.updateMany({
    data: {
      homeScore: null,
      awayScore: null,
      pkHomeScore: null,
      pkAwayScore: null,
      isFinished: false,
    },
  })
  await prisma.leagueResultOverride.deleteMany()

  const league = await prisma.league.findUnique({ where: { slug: SLEEPWELL_SLUG } })
  if (!league) throw new Error(`League ${SLEEPWELL_SLUG} not found`)

  const userNames = prod.users
  if (userNames.length === 0) throw new Error('No users found in production picks')

  await prisma.prediction.deleteMany({ where: { user: { leagueId: league.id } } })
  await prisma.user.deleteMany({ where: { leagueId: league.id } })
  await prisma.leagueResultOverride.deleteMany({ where: { leagueId: league.id } })

  const pinHash = hashPin(DEFAULT_PIN)
  const userByName = new Map<string, string>()
  for (const name of userNames) {
    const user = await prisma.user.create({
      data: { leagueId: league.id, name, passwordHash: pinHash },
    })
    userByName.set(name, user.id)
  }

  const dbMatches = await prisma.match.findMany({ orderBy: { kickoffTime: 'asc' } })
  const matchByTeams = new Map<string, (typeof dbMatches)[0]>()
  for (const m of dbMatches) {
    matchByTeams.set(`${normalizeTeam(m.homeTeam)}|${normalizeTeam(m.awayTeam)}`, m)
  }

  let predictionsCreated = 0
  let resultsSet = 0
  let unmatched = 0

  for (const row of prod.matches) {
    const key = `${normalizeTeam(row.homeTeam)}|${normalizeTeam(row.awayTeam)}`
    const match = matchByTeams.get(key)
    if (!match) {
      unmatched++
      console.warn(`  No DB match for: ${row.homeTeam} vs ${row.awayTeam}`)
      continue
    }

    if (row.isFinished && row.homeScore != null && row.awayScore != null) {
      await prisma.match.update({
        where: { id: match.id },
        data: {
          homeScore: row.homeScore,
          awayScore: row.awayScore,
          pkHomeScore: row.pkHomeScore,
          pkAwayScore: row.pkAwayScore,
          isFinished: true,
        },
      })
      resultsSet++
    }
  }

  for (const pred of prod.predictions) {
    const key = `${normalizeTeam(pred.homeTeam)}|${normalizeTeam(pred.awayTeam)}`
    const match = matchByTeams.get(key)
    const userId = userByName.get(pred.userName)
    if (!match || !userId) {
      unmatched++
      continue
    }

    await prisma.prediction.create({
      data: {
        userId,
        matchId: match.id,
        homeScore: pred.homeScore,
        awayScore: pred.awayScore,
        pkHomeScore: pred.pkHomeScore,
        pkAwayScore: pred.pkAwayScore,
      },
    })
    predictionsCreated++
  }

  const finishedMatches = await prisma.match.findMany({ where: { isFinished: true } })
  for (const match of finishedMatches) {
    await recalculatePointsForMatch(match.id, match.stage)
  }

  const users = await prisma.user.findMany({
    where: { leagueId: league.id },
    include: { predictions: true },
    orderBy: { name: 'asc' },
  })

  console.log(`\nImported into local ${SLEEPWELL_SLUG} league:`)
  console.log(`  Users: ${users.length}`)
  console.log(`  Predictions: ${predictionsCreated}`)
  console.log(`  Match results synced: ${resultsSet}`)
  const unfinished = await prisma.match.count({ where: { isFinished: false } })
  console.log(`  Matches still open (no result yet): ${unfinished}`)
  if (unmatched) console.log(`  Unmatched rows: ${unmatched}`)
  console.log(`\nPlayer PIN (all users): ${DEFAULT_PIN}`)
  console.log(`Open: http://localhost:3000/${SLEEPWELL_SLUG}/predict`)
  console.log(`      http://localhost:3000/${SLEEPWELL_SLUG}/picks\n`)
  console.log('Leaderboard:')
  const sorted = users
    .map((u) => ({ name: u.name, pts: u.predictions.reduce((s, p) => s + p.points, 0) }))
    .sort((a, b) => b.pts - a.pts)
  for (const u of sorted) {
    console.log(`  ${u.name}: ${u.pts} pts`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
