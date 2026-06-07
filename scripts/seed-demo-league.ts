/**
 * Seeds wc26-demo only: 10 participants, random predictions, league-only results.
 * Does NOT modify global Match scores — sleepwell and other leagues stay untouched.
 *
 * Usage: npx tsx scripts/seed-demo-league.ts
 */
import { PrismaClient } from '@prisma/client'
import { isKnockoutStage } from '../src/lib/penalties'
import { resolveEffectiveResult } from '../src/lib/effectiveResults'
import { computePredictionPoints } from '../src/lib/scoring'
import { hashPin } from '../src/lib/auth'

const prisma = new PrismaClient()

const DEMO_SLUG = 'wc26-demo'
const DEMO_NAME = 'Demo Showcase'
const DEMO_ADMIN = 'demo'
const PARTICIPANTS = [
  'Alex',
  'Blake',
  'Casey',
  'Drew',
  'Ellis',
  'Frank',
  'Grace',
  'Hanna',
  'Ivan',
  'Jules',
]
const PIN = '1234'

type PlannedResult = {
  homeScore: number
  awayScore: number
  pkHome: number | null
  pkAway: number | null
}

function seededRandom(seed: string) {
  let state = 0
  for (let i = 0; i < seed.length; i++) {
    state = (state * 31 + seed.charCodeAt(i)) >>> 0
  }
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0xffffffff
  }
}

function planResult(matchId: string, stage: string): PlannedResult {
  const rand = seededRandom(`result-${matchId}`)
  let home = Math.floor(rand() * 4)
  let away = Math.floor(rand() * 4)
  let pkHome: number | null = null
  let pkAway: number | null = null

  if (isKnockoutStage(stage)) {
    if (home === away) {
      pkHome = 5
      pkAway = 4
    }
  } else if (home === away) {
    away = home < 3 ? home + 1 : home - 1
  }

  return { homeScore: home, awayScore: away, pkHome, pkAway }
}

function randomGuess(userName: string, matchId: string, stage: string): PlannedResult {
  const rand = seededRandom(`guess-${userName}-${matchId}`)
  const maxGoals = stage === 'GROUP' ? 5 : 4
  let home = Math.floor(rand() * (maxGoals + 1))
  let away = Math.floor(rand() * (maxGoals + 1))
  let pkHome: number | null = null
  let pkAway: number | null = null

  if (isKnockoutStage(stage) && home === away) {
    if (rand() < 0.55) {
      pkHome = 3 + Math.floor(rand() * 4)
      pkAway = 3 + Math.floor(rand() * 4)
      if (pkHome === pkAway) pkAway = pkHome + 1
    } else {
      away = home === 0 ? 1 : Math.max(0, home - 1 - Math.floor(rand() * 2))
      if (away === home) away = home + 1
    }
  }

  return { homeScore: home, awayScore: away, pkHome, pkAway }
}

async function applyLeagueOverride(leagueId: string, matchId: string, result: PlannedResult) {
  await prisma.leagueResultOverride.upsert({
    where: { leagueId_matchId: { leagueId, matchId } },
    update: {
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      pkHomeScore: result.pkHome,
      pkAwayScore: result.pkAway,
      isFinished: true,
    },
    create: {
      leagueId,
      matchId,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      pkHomeScore: result.pkHome,
      pkAwayScore: result.pkAway,
      isFinished: true,
    },
  })
}

async function recalculateDemoLeaguePoints(leagueId: string) {
  const predictions = await prisma.prediction.findMany({
    where: { user: { leagueId } },
  })
  if (predictions.length === 0) return

  const matchIds = [...new Set(predictions.map((p) => p.matchId))]
  const [matches, overrides] = await Promise.all([
    prisma.match.findMany({ where: { id: { in: matchIds } } }),
    prisma.leagueResultOverride.findMany({
      where: { leagueId, matchId: { in: matchIds } },
    }),
  ])

  const matchById = new Map(matches.map((m) => [m.id, m]))
  const overrideByMatchId = new Map(overrides.map((o) => [o.matchId, o]))

  for (const pred of predictions) {
    const match = matchById.get(pred.matchId)
    if (!match) continue

    const override = overrideByMatchId.get(pred.matchId)
    const effective = resolveEffectiveResult({
      global: {
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        pkHomeScore: match.pkHomeScore,
        pkAwayScore: match.pkAwayScore,
        isFinished: match.isFinished,
      },
      override: override
        ? {
            homeScore: override.homeScore,
            awayScore: override.awayScore,
            pkHomeScore: override.pkHomeScore,
            pkAwayScore: override.pkAwayScore,
            isFinished: override.isFinished,
          }
        : null,
    })

    if (!effective.isFinished || effective.homeScore == null || effective.awayScore == null) {
      await prisma.prediction.update({ where: { id: pred.id }, data: { points: 0 } })
      continue
    }

    const points = computePredictionPoints(
      match.stage,
      effective.homeScore,
      effective.awayScore,
      effective.pkHomeScore,
      effective.pkAwayScore,
      pred
    )
    await prisma.prediction.update({ where: { id: pred.id }, data: { points } })
  }
}

async function main() {
  const matchCount = await prisma.match.count()
  if (matchCount === 0) {
    throw new Error('No matches in DB — run: npx tsx scripts/seed-schedule.ts')
  }

  let league = await prisma.league.findUnique({ where: { slug: DEMO_SLUG } })
  if (league) {
    await prisma.prediction.deleteMany({ where: { user: { leagueId: league.id } } })
    await prisma.user.deleteMany({ where: { leagueId: league.id } })
    await prisma.leagueResultOverride.deleteMany({ where: { leagueId: league.id } })
  } else {
    league = await prisma.league.create({
      data: {
        slug: DEMO_SLUG,
        name: DEMO_NAME,
        adminPasswordHash: hashPin(DEMO_ADMIN),
        isPublic: true,
        useGlobalResults: false,
      },
    })
  }

  const users = []
  for (const name of PARTICIPANTS) {
    users.push(
      await prisma.user.create({
        data: { leagueId: league.id, name, passwordHash: hashPin(PIN) },
      })
    )
  }

  const matches = await prisma.match.findMany({ orderBy: { kickoffTime: 'asc' } })
  const plannedResults = new Map(matches.map((m) => [m.id, planResult(m.id, m.stage)]))
  const overrideByMatchId = new Map<string, PlannedResult>()

  for (const match of matches) {
    for (const user of users) {
      const guess = randomGuess(user.name, match.id, match.stage)
      await prisma.prediction.create({
        data: {
          userId: user.id,
          matchId: match.id,
          homeScore: guess.homeScore,
          awayScore: guess.awayScore,
          pkHomeScore: guess.pkHome,
          pkAwayScore: guess.pkAway,
        },
      })
    }

    const result = plannedResults.get(match.id)!
    await applyLeagueOverride(league.id, match.id, result)
    overrideByMatchId.set(match.id, result)
  }

  await recalculateDemoLeaguePoints(league.id)

  const totals = await prisma.user.findMany({
    where: { leagueId: league.id },
    include: { predictions: true },
    orderBy: { name: 'asc' },
  })

  console.log(`\nDemo league: http://localhost:3000/${DEMO_SLUG}`)
  console.log(`Admin: ${DEMO_ADMIN} | Player PIN: ${PIN}`)
  console.log('Global Match scores: NOT modified (sleepwell unaffected)\n')
  console.log('Leaderboard (scored vs demo league overrides):')
  for (const u of totals) {
    const pts = u.predictions.reduce((s, p) => s + p.points, 0)
    const exact = u.predictions.filter((p) => {
      const override = overrideByMatchId.get(p.matchId)
      return (
        override &&
        p.homeScore === override.homeScore &&
        p.awayScore === override.awayScore
      )
    }).length
    console.log(`  ${u.name}: ${pts} pts (${exact} exact-score hits)`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
