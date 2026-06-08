import { prisma } from '@/lib/prisma'
import { buildMatchScheduleFromCsv } from '@/lib/seedMatches'
import { isGroupPlaceholder } from './groups'
import {
  buildAllGroupStandings,
  isGroupStageComplete,
  resolvePlaceholder,
  StandingRow,
} from './groupStandings'
import { normalizePlayoffPlaceholderTeamNames } from './playoffNormalize'

export function resolveR32TeamName(
  canonical: string,
  standingsByGroup: Map<string, StandingRow[] | null> | null
): string {
  if (!isGroupPlaceholder(canonical) || !standingsByGroup) return canonical
  return resolvePlaceholder(canonical, standingsByGroup) ?? canonical
}

export async function updateR32TeamsFromGroupStage() {
  await normalizePlayoffPlaceholderTeamNames()

  const canonicalByMatchNum = new Map(
    buildMatchScheduleFromCsv()
      .filter((m) => m.stage === 'R32')
      .map((m) => [m.matchNum, { homeTeam: m.homeTeam, awayTeam: m.awayTeam }])
  )

  const [groupMatches, r32Matches] = await Promise.all([
    prisma.match.findMany({ where: { stage: 'GROUP' } }),
    prisma.match.findMany({ where: { stage: 'R32' } }),
  ])

  const groupStageComplete = isGroupStageComplete(groupMatches)
  const standingsByGroup = groupStageComplete ? buildAllGroupStandings(groupMatches) : null

  for (const match of r32Matches) {
    if (!match.matchNum) continue
    const canonical = canonicalByMatchNum.get(match.matchNum)
    if (!canonical) continue

    const homeTeam = resolveR32TeamName(canonical.homeTeam, standingsByGroup)
    const awayTeam = resolveR32TeamName(canonical.awayTeam, standingsByGroup)

    if (match.homeTeam !== homeTeam || match.awayTeam !== awayTeam) {
      await prisma.match.update({
        where: { id: match.id },
        data: { homeTeam, awayTeam },
      })
    }
  }
}
