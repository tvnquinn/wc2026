import { prisma } from '@/lib/prisma'
import { buildMatchScheduleFromCsv, ScheduleRow } from '@/lib/seedMatches'
import { isGroupPlaceholder } from './groups'
import {
  buildAllGroupStandings,
  isGroupStageComplete,
  resolvePlaceholder,
  StandingRow,
} from './groupStandings'
import { normalizePlayoffPlaceholderTeamNames } from './playoffNormalize'

type R32DbMatch = {
  id: string
  matchNum: string | null
  homeTeam: string
  awayTeam: string
  kickoffTime: Date
}

export function resolveR32TeamName(
  canonical: string,
  standingsByGroup: Map<string, StandingRow[] | null> | null
): string {
  if (!isGroupPlaceholder(canonical) || !standingsByGroup) return canonical
  return resolvePlaceholder(canonical, standingsByGroup) ?? canonical
}

export function getCanonicalR32Schedule(): ScheduleRow[] {
  return buildMatchScheduleFromCsv()
    .filter((m) => m.stage === 'R32')
    .sort((a, b) => a.kickoffTime.getTime() - b.kickoffTime.getTime())
}

/** Pair DB R32 rows with CSV schedule by matchNum, falling back to kickoff order. */
export function pairR32WithCanonical(
  dbMatches: R32DbMatch[],
  csvMatches: ScheduleRow[]
): Array<{ db: R32DbMatch; canonical: ScheduleRow }> {
  const csvByMatchNum = new Map(csvMatches.map((m) => [m.matchNum, m]))
  const csvByKickoff = [...csvMatches].sort(
    (a, b) => a.kickoffTime.getTime() - b.kickoffTime.getTime()
  )
  const dbByKickoff = [...dbMatches].sort(
    (a, b) => a.kickoffTime.getTime() - b.kickoffTime.getTime()
  )

  const pairs: Array<{ db: R32DbMatch; canonical: ScheduleRow }> = []
  const usedCsv = new Set<string>()

  for (const db of dbByKickoff) {
    let canonical = db.matchNum ? csvByMatchNum.get(db.matchNum) : undefined
    if (canonical) {
      usedCsv.add(canonical.matchNum)
    } else {
      canonical = csvByKickoff.find((row) => !usedCsv.has(row.matchNum))
      if (canonical) usedCsv.add(canonical.matchNum)
    }
    if (canonical) pairs.push({ db, canonical })
  }

  return pairs
}

export async function updateR32TeamsFromGroupStage() {
  await normalizePlayoffPlaceholderTeamNames()

  const csvR32 = getCanonicalR32Schedule()
  const r32Matches = await prisma.match.findMany({ where: { stage: 'R32' } })
  const groupMatches = await prisma.match.findMany({ where: { stage: 'GROUP' } })

  const groupStageComplete = isGroupStageComplete(groupMatches)
  const standingsByGroup = groupStageComplete ? buildAllGroupStandings(groupMatches) : null

  for (const { db, canonical } of pairR32WithCanonical(r32Matches, csvR32)) {
    const homeTeam = resolveR32TeamName(canonical.homeTeam, standingsByGroup)
    const awayTeam = resolveR32TeamName(canonical.awayTeam, standingsByGroup)

    const data: { homeTeam: string; awayTeam: string; matchNum?: string } = {
      homeTeam,
      awayTeam,
    }
    if (!db.matchNum && canonical.matchNum) {
      data.matchNum = canonical.matchNum
    }

    if (
      db.homeTeam !== homeTeam ||
      db.awayTeam !== awayTeam ||
      data.matchNum !== undefined
    ) {
      await prisma.match.update({
        where: { id: db.id },
        data,
      })
    }
  }
}
