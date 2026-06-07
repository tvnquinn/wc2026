import { prisma } from '@/lib/prisma'
import { getR32PlaceholderUpdates } from './bracket'
import { buildAllGroupStandings } from './groupStandings'

export async function updateR32TeamsFromGroupStage() {
  const [groupMatches, r32Matches] = await Promise.all([
    prisma.match.findMany({ where: { stage: 'GROUP' } }),
    prisma.match.findMany({ where: { stage: 'R32' } }),
  ])

  const standingsByGroup = buildAllGroupStandings(groupMatches)
  const updates = getR32PlaceholderUpdates(r32Matches, standingsByGroup)

  for (const update of updates) {
    await prisma.match.update({
      where: { id: update.matchId },
      data: update.slot === 'HOME' ? { homeTeam: update.team } : { awayTeam: update.team },
    })
  }
}
