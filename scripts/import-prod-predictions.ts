/**
 * Imports predictions from the public production picks page into local SQLite.
 * Usage: DATABASE_URL=file:./prisma/dev.db npx tsx scripts/import-prod-predictions.ts
 */
import { PrismaClient } from '@prisma/client'
import { hashPin } from '../src/lib/auth'
import { ensureDefaultLeague } from '../src/lib/ensureDefaultLeague'

const PROD_PICKS_URL = 'https://wc26pool.vercel.app/sleepwell/picks'
const DEFAULT_PIN = '1234'

type ParsedScore = {
  homeScore: number
  awayScore: number
  pkHomeScore: number | null
  pkAwayScore: number | null
}

function parseScoreDisplay(raw: string): ParsedScore | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const penaltyMatch = trimmed.match(/^(\d+)-(\d+)\s+\((\d+)-(\d+)\)$/)
  if (penaltyMatch) {
    return {
      homeScore: Number(penaltyMatch[1]),
      awayScore: Number(penaltyMatch[2]),
      pkHomeScore: Number(penaltyMatch[3]),
      pkAwayScore: Number(penaltyMatch[4]),
    }
  }

  const baseMatch = trimmed.match(/^(\d+)-(\d+)$/)
  if (!baseMatch) return null

  return {
    homeScore: Number(baseMatch[1]),
    awayScore: Number(baseMatch[2]),
    pkHomeScore: null,
    pkAwayScore: null,
  }
}

function parseMatchLabel(raw: string): { homeTeam: string; awayTeam: string } | null {
  const cleaned = raw.replace(/<!-- -->/g, '').trim()
  const parts = cleaned.split(' - ')
  if (parts.length !== 2) return null
  return { homeTeam: parts[0].trim(), awayTeam: parts[1].trim() }
}

async function fetchProdPicksHtml(): Promise<string> {
  const res = await fetch(PROD_PICKS_URL)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${PROD_PICKS_URL}: ${res.status}`)
  }
  return res.text()
}

function parsePicksPage(html: string) {
  const users = [...html.matchAll(/picks-grid-user-col" style="color:[^"]+">([^<]+)<\/th>/g)].map(
    (m) => m[1].trim(),
  )
  if (users.length === 0) {
    throw new Error('No users found on production picks page')
  }

  const rows: Array<{ homeTeam: string; awayTeam: string; picks: string[] }> = []
  for (const match of html.matchAll(
    /<tr><td class="picks-grid-stage-col">[^<]*<\/td><td class="picks-grid-match-col">([\s\S]*?)<\/td><td class="picks-grid-result-col">[^<]*<\/td>([\s\S]*?)<\/tr>/g,
  )) {
    const teams = parseMatchLabel(match[1])
    if (!teams) continue
    const picks = [...match[2].matchAll(/picks-grid-user-col">([^<]*)<\/td>/g)].map((m) =>
      m[1].trim(),
    )
    rows.push({ ...teams, picks })
  }

  if (rows.length === 0) {
    throw new Error('No match rows found on production picks page')
  }

  return { users, rows }
}

const prisma = new PrismaClient()

async function main() {
  console.log(`Fetching ${PROD_PICKS_URL} ...`)
  const html = await fetchProdPicksHtml()
  const { users, rows } = parsePicksPage(html)

  const league = await ensureDefaultLeague()
  const matches = await prisma.match.findMany()
  const matchByTeams = new Map(
    matches.map((m) => [`${m.homeTeam}\0${m.awayTeam}`, m] as const),
  )

  let usersCreated = 0
  let predictionsImported = 0
  let skipped = 0

  for (const userName of users) {
    let user = await prisma.user.findUnique({
      where: { leagueId_name: { leagueId: league.id, name: userName } },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          leagueId: league.id,
          name: userName,
          passwordHash: hashPin(DEFAULT_PIN),
        },
      })
      usersCreated++
      console.log(`Created user "${userName}" with PIN ${DEFAULT_PIN}`)
    }

    for (const row of rows) {
      const pickIndex = users.indexOf(userName)
      const rawPick = row.picks[pickIndex] ?? ''
      const parsed = parseScoreDisplay(rawPick)
      if (!parsed) continue

      const match = matchByTeams.get(`${row.homeTeam}\0${row.awayTeam}`)
      if (!match) {
        console.warn(`No local match for: ${row.homeTeam} - ${row.awayTeam}`)
        skipped++
        continue
      }

      await prisma.prediction.upsert({
        where: { userId_matchId: { userId: user.id, matchId: match.id } },
        create: {
          userId: user.id,
          matchId: match.id,
          ...parsed,
          points: 0,
        },
        update: parsed,
      })
      predictionsImported++
    }
  }

  console.log(
    `Done. Users created: ${usersCreated}, predictions imported: ${predictionsImported}, unmatched rows: ${skipped}`,
  )
  console.log(`Select "${users.join('", "')}" on /sleepwell/predict (PIN ${DEFAULT_PIN}).`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
