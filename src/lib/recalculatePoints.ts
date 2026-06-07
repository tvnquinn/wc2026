import { prisma } from '@/lib/prisma'
import { resolveEffectiveResult, type MatchResultFields } from '@/lib/effectiveResults'
import { computePredictionPoints } from '@/lib/scoring'

/**
 * Recompute denormalized prediction.points for every league after a match result changes.
 * Must be called on every result write — leaderboard totals read stored points, not live scoring.
 */
export async function recalculatePointsForMatch(matchId: string, stage: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } })
  if (!match) return

  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    include: { user: true },
  })
  if (predictions.length === 0) return

  const leagueIds = [...new Set(predictions.map((p) => p.user.leagueId))]
  const overrides = await prisma.leagueResultOverride.findMany({
    where: { matchId, leagueId: { in: leagueIds } },
  })

  const globalResult: MatchResultFields = {
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    pkHomeScore: match.pkHomeScore,
    pkAwayScore: match.pkAwayScore,
    isFinished: match.isFinished,
  }

  for (const pred of predictions) {
    const override = overrides.find((o) => o.leagueId === pred.user.leagueId)
    const effective = resolveEffectiveResult({
      global: globalResult,
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

    const earnedPoints = computePredictionPoints(
      stage,
      effective.homeScore,
      effective.awayScore,
      effective.pkHomeScore,
      effective.pkAwayScore,
      pred
    )

    await prisma.prediction.update({
      where: { id: pred.id },
      data: { points: earnedPoints },
    })
  }
}
