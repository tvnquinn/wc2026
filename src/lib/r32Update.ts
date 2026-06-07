import { prisma } from '@/lib/prisma'
import { getGroupPlaceholderUpdates } from './bracket'
import { buildAllGroupStandings } from './groupStandings'
import { normalizePlayoffPlaceholderTeamNames } from './playoffNormalize'

export async function updateR32TeamsFromGroupStage() {
  await normalizePlayoffPlaceholderTeamNames()
  const [groupMatches, allMatches] = await Promise.all([
    prisma.match.findMany({ where: { stage: 'GROUP' } }),
    prisma.match.findMany(),
  ])

  const standingsByGroup = buildAllGroupStandings(groupMatches)
  const updates = getGroupPlaceholderUpdates(allMatches, standingsByGroup)

  for (const update of updates) {
    await prisma.match.update({
      where: { id: update.matchId },
      data: update.slot === 'HOME' ? { homeTeam: update.team } : { awayTeam: update.team },
    })
  }
}
