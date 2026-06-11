import { buildMatchScheduleFromCsv, ScheduleRow } from '@/lib/seedMatches'

type MatchSlot = 'homeTeam' | 'awayTeam'

export type DbMatchRow = {
  id: string
  matchNum: string | null
  homeTeam: string
  awayTeam: string
  isFinished: boolean
  kickoffTime: Date
}

export type PlaceholderReset = {
  matchId: string
  slot: MatchSlot
  team: string
}

/** Map W/L bracket codes (e.g. W73, L101) to the feeder match number in matches.csv. */
export function getFeederMatchNum(slot: string): string | null {
  if (!slot.startsWith('W') && !slot.startsWith('L')) return null
  if (slot === 'W191') return '101'
  return slot.slice(1)
}

export function isWinnerOrLoserPlaceholder(team: string): boolean {
  return team.startsWith('W') || team.startsWith('L')
}

/** Index DB rows by matchNum, falling back to kickoff order when matchNum is missing. */
export function buildDbByMatchNum(
  schedule: ScheduleRow[],
  dbMatches: DbMatchRow[]
): Map<string, DbMatchRow> {
  const byMatchNum = new Map<string, DbMatchRow>()
  for (const match of dbMatches) {
    if (match.matchNum) byMatchNum.set(match.matchNum, match)
  }

  if (schedule.length !== dbMatches.length) return byMatchNum

  const scheduleSorted = [...schedule].sort(
    (a, b) => a.kickoffTime.getTime() - b.kickoffTime.getTime()
  )
  const dbSorted = [...dbMatches].sort(
    (a, b) => a.kickoffTime.getTime() - b.kickoffTime.getTime()
  )

  for (let i = 0; i < scheduleSorted.length; i++) {
    const matchNum = scheduleSorted[i].matchNum
    if (!byMatchNum.has(matchNum)) {
      byMatchNum.set(matchNum, dbSorted[i])
    }
  }

  return byMatchNum
}

export function getUnresolvedKnockoutPlaceholderResets(
  schedule: ScheduleRow[],
  dbMatches: DbMatchRow[]
): PlaceholderReset[] {
  const dbByMatchNum = buildDbByMatchNum(schedule, dbMatches)
  const resets: PlaceholderReset[] = []

  for (const canonical of schedule) {
    if (canonical.stage === 'GROUP') continue

    const db = dbByMatchNum.get(canonical.matchNum)
    if (!db) continue

    for (const slot of ['homeTeam', 'awayTeam'] as const) {
      const placeholder = canonical[slot]
      const feederNum = getFeederMatchNum(placeholder)
      if (!feederNum) continue

      const feeder = dbByMatchNum.get(feederNum)
      if (feeder?.isFinished) continue
      if (db[slot] === placeholder) continue

      resets.push({ matchId: db.id, slot, team: placeholder })
    }
  }

  return resets
}

export function getCanonicalSchedule(): ScheduleRow[] {
  return buildMatchScheduleFromCsv()
}
