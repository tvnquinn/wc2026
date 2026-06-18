import { prisma } from '@/lib/prisma'
import {
  effectiveInputForMatch,
  isScoredForLeague,
  resolveEffectiveResult,
} from '@/lib/effectiveResults'
import {
  isJackpotEligibleMatch,
  replayJackpot,
  type JackpotActual,
  type JackpotMatchInput,
} from '@/lib/jackpot'
import { ensureMatchNumsBackfilled, resolveMatchNumById } from '@/lib/matchNumResolution'

function actualForLeague(
  homeScore: number | null,
  awayScore: number | null,
  pkHomeScore: number | null,
  pkAwayScore: number | null,
  scored: boolean
): JackpotActual {
  return {
    homeScore: homeScore ?? 0,
    awayScore: awayScore ?? 0,
    pkHomeScore,
    pkAwayScore,
    isFinished: scored,
  }
}

export async function buildJackpotInputsForLeague(leagueId: string): Promise<JackpotMatchInput[]> {
  await ensureMatchNumsBackfilled()

  const [matches, overrides, predictions] = await Promise.all([
    prisma.match.findMany({ orderBy: { kickoffTime: 'asc' } }),
    prisma.leagueResultOverride.findMany({ where: { leagueId } }),
    prisma.prediction.findMany({
      where: { user: { leagueId } },
      select: {
        userId: true,
        matchId: true,
        homeScore: true,
        awayScore: true,
        pkHomeScore: true,
        pkAwayScore: true,
      },
    }),
  ])

  const matchNumById = resolveMatchNumById(matches)

  const overrideByMatchId = new Map(overrides.map((o) => [o.matchId, o]))
  const predictionsByMatchId = new Map<string, typeof predictions>()
  for (const pred of predictions) {
    const list = predictionsByMatchId.get(pred.matchId) ?? []
    list.push(pred)
    predictionsByMatchId.set(pred.matchId, list)
  }

  return matches
    .map((match) => ({ ...match, matchNum: matchNumById.get(match.id) ?? match.matchNum }))
    .filter((match) => isJackpotEligibleMatch(match.matchNum))
    .map((match) => {
      const input = effectiveInputForMatch(match, overrideByMatchId.get(match.id))
      const scored = isScoredForLeague(input)
      const effective = resolveEffectiveResult(input)

      return {
        matchNum: match.matchNum,
        stage: match.stage,
        kickoffTime: match.kickoffTime,
        actual: actualForLeague(
          effective.homeScore,
          effective.awayScore,
          effective.pkHomeScore,
          effective.pkAwayScore,
          scored
        ),
        predictions: (predictionsByMatchId.get(match.id) ?? []).map((pred) => ({
          userId: pred.userId,
          homeScore: pred.homeScore,
          awayScore: pred.awayScore,
          pkHomeScore: pred.pkHomeScore,
          pkAwayScore: pred.pkAwayScore,
        })),
      }
    })
}

export async function recalculateJackpotForLeague(leagueId: string): Promise<void> {
  const userCount = await prisma.user.count({ where: { leagueId } })
  if (userCount === 0) return

  const inputs = await buildJackpotInputsForLeague(leagueId)
  const result = replayJackpot(inputs, { now: new Date() })

  await prisma.$transaction(async (tx) => {
    await tx.league.update({
      where: { id: leagueId },
      data: {
        jackpotBalance: result.pot,
        jackpotSeededAt: new Date(),
      },
    })

    await tx.user.updateMany({
      where: { leagueId },
      data: { jackpotWinnings: 0 },
    })

    for (const [userId, amount] of Object.entries(result.userWinnings)) {
      await tx.user.update({
        where: { id: userId },
        data: { jackpotWinnings: amount },
      })
    }
  })
}

export async function recalculateJackpotForAllLeagues(): Promise<void> {
  const leagues = await prisma.league.findMany({ select: { id: true } })
  for (const league of leagues) {
    await recalculateJackpotForLeague(league.id)
  }
}

export async function refreshJackpotForLeague(leagueId: string): Promise<void> {
  await recalculateJackpotForLeague(leagueId)
}

/** @deprecated Use refreshJackpotForLeague — always recalculates now. */
export async function ensureJackpotSeededForLeague(leagueId: string): Promise<void> {
  await refreshJackpotForLeague(leagueId)
}
