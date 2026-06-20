/**
 * Mirrors production sleepwell data into local SQLite by scraping the public predict page.
 * Usage: DATABASE_URL=file:./prisma/dev.db npx tsx scripts/import-prod-snapshot.ts
 */
import { PrismaClient } from '@prisma/client'
import { join } from 'node:path'
import { hashPin } from '../src/lib/auth'
import { ensureDefaultLeague } from '../src/lib/ensureDefaultLeague'
import { resolveHostLeagueSlug } from '../src/lib/league'

const DEFAULT_PIN = '1234'

type ProdUser = { id: string; name: string }
type ProdMatch = {
  id: string
  matchNum: string | null
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  pkHomeScore: number | null
  pkAwayScore: number | null
  isFinished: boolean
}
type ProdPrediction = {
  userId: string
  matchId: string
  homeScore: number
  awayScore: number
  pkHomeScore: number | null
  pkAwayScore: number | null
  points: number
}

function prodPredictUrl(): string {
  const slug = process.env.HOST_LEAGUE_SLUG?.trim() || resolveHostLeagueSlug()
  return `https://wc26pool.vercel.app/${slug}/predict`
}

function extractLargestRscChunk(html: string): string {
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)].map(
    (match) => match[1],
  )
  if (chunks.length === 0) {
    throw new Error('No RSC payload found on production predict page')
  }
  return chunks.reduce((largest, chunk) => (chunk.length > largest.length ? chunk : largest))
}

function decodeRscChunk(chunk: string): string {
  return JSON.parse(`"${chunk}"`) as string
}

function parseJsonArray<T>(payload: string, key: string): T[] {
  const marker = `"${key}":`
  const start = payload.indexOf(marker)
  if (start === -1) {
    throw new Error(`Could not find "${key}" in production payload`)
  }

  const arrayStart = payload.indexOf('[', start)
  if (arrayStart === -1) {
    throw new Error(`Could not find array for "${key}"`)
  }

  let depth = 0
  for (let i = arrayStart; i < payload.length; i++) {
    const char = payload[i]
    if (char === '[') depth++
    if (char === ']') {
      depth--
      if (depth === 0) {
        return JSON.parse(payload.slice(arrayStart, i + 1)) as T[]
      }
    }
  }

  throw new Error(`Unterminated array for "${key}"`)
}

async function fetchProdSnapshot() {
  const url = prodPredictUrl()
  console.log(`Fetching ${url} ...`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`)
  }

  const html = await res.text()
  const payload = decodeRscChunk(extractLargestRscChunk(html))

  return {
    users: parseJsonArray<ProdUser>(payload, 'users'),
    matches: parseJsonArray<ProdMatch>(payload, 'matches'),
    predictions: parseJsonArray<ProdPrediction>(payload, 'allPredictions'),
  }
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ??
        `file:${join(process.cwd(), 'prisma/dev.db')}`,
    },
  },
})

async function main() {
  const { users, matches, predictions } = await fetchProdSnapshot()
  const league = await ensureDefaultLeague()

  const localMatches = await prisma.match.findMany()
  const localMatchByNum = new Map(
    localMatches.filter((m) => m.matchNum).map((m) => [m.matchNum!, m] as const),
  )
  const prodMatchNumById = new Map(
    matches.filter((m) => m.matchNum).map((m) => [m.id, m.matchNum!] as const),
  )

  let resultsUpdated = 0
  for (const match of matches) {
    if (!match.isFinished || !match.matchNum) continue
    const local = localMatchByNum.get(match.matchNum)
    if (!local) {
      console.warn(`No local match for ${match.matchNum}: ${match.homeTeam} - ${match.awayTeam}`)
      continue
    }

    await prisma.match.update({
      where: { id: local.id },
      data: {
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        pkHomeScore: match.pkHomeScore,
        pkAwayScore: match.pkAwayScore,
        isFinished: true,
      },
    })
    resultsUpdated++
  }

  const prodUserById = new Map(users.map((u) => [u.id, u.name] as const))
  const localUserIdByName = new Map<string, string>()
  let usersCreated = 0

  for (const prodUser of users) {
    let localUser = await prisma.user.findUnique({
      where: { leagueId_name: { leagueId: league.id, name: prodUser.name } },
    })

    if (!localUser) {
      localUser = await prisma.user.create({
        data: {
          leagueId: league.id,
          name: prodUser.name,
          passwordHash: hashPin(DEFAULT_PIN),
        },
      })
      usersCreated++
    }

    localUserIdByName.set(prodUser.name, localUser.id)
  }

  let predictionsImported = 0
  let predictionsSkipped = 0

  for (const prediction of predictions) {
    const userName = prodUserById.get(prediction.userId)
    const matchNum = prodMatchNumById.get(prediction.matchId)
    if (!userName || !matchNum) {
      predictionsSkipped++
      continue
    }

    const localUserId = localUserIdByName.get(userName)
    const localMatch = localMatchByNum.get(matchNum)
    if (!localUserId || !localMatch) {
      predictionsSkipped++
      continue
    }

    await prisma.prediction.upsert({
      where: { userId_matchId: { userId: localUserId, matchId: localMatch.id } },
      create: {
        userId: localUserId,
        matchId: localMatch.id,
        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,
        pkHomeScore: prediction.pkHomeScore,
        pkAwayScore: prediction.pkAwayScore,
        points: prediction.points,
      },
      update: {
        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,
        pkHomeScore: prediction.pkHomeScore,
        pkAwayScore: prediction.pkAwayScore,
        points: prediction.points,
      },
    })
    predictionsImported++
  }

  console.log(
    `Synced prod snapshot: ${resultsUpdated} results, ${usersCreated} users created, ${predictionsImported} predictions (${predictionsSkipped} skipped).`,
  )
  console.log(`Open http://localhost:${process.env.PORT ?? '3000'}/${league.slug}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
