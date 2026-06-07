import { prisma } from '@/lib/prisma'
import { getKnockoutBracketUpdates } from '@/lib/bracket'
import { resolvePlayoffPlaceholder } from '@/lib/groups'
import { normalizePlayoffPlaceholderTeamNames } from '@/lib/playoffNormalize'
import { updateR32TeamsFromGroupStage } from '@/lib/r32Update'

export { normalizePlayoffPlaceholderTeamNames } from '@/lib/playoffNormalize'

/** Re-apply knockout bracket slots from finished matches (after placeholder cleanup). */
export async function replayKnockoutBracketFromResults() {
  const finished = await prisma.match.findMany({
    where: { isFinished: true, stage: { not: 'GROUP' } },
    orderBy: { kickoffTime: 'asc' },
  })

  for (const match of finished) {
    if (match.homeScore == null || match.awayScore == null) continue

    const bracketUpdates = getKnockoutBracketUpdates({
      id: match.id,
      stage: match.stage,
      homeTeam: resolvePlayoffPlaceholder(match.homeTeam),
      awayTeam: resolvePlayoffPlaceholder(match.awayTeam),
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      pkHomeScore: match.pkHomeScore,
      pkAwayScore: match.pkAwayScore,
      nextMatchId: match.nextMatchId,
      nextMatchSlot: match.nextMatchSlot,
      loserNextMatchId: match.loserNextMatchId,
      loserNextMatchSlot: match.loserNextMatchSlot,
    })

    for (const update of bracketUpdates) {
      await prisma.match.update({
        where: { id: update.matchId },
        data: update.slot === 'HOME' ? { homeTeam: update.team } : { awayTeam: update.team },
      })
    }
  }
}

export async function syncAllMatchTeamNames() {
  await normalizePlayoffPlaceholderTeamNames()
  await updateR32TeamsFromGroupStage()
  await replayKnockoutBracketFromResults()
}
