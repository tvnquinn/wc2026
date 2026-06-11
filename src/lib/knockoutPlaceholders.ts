import { buildMatchScheduleFromCsv, ScheduleRow } from '@/lib/seedMatches'

type MatchSlot = 'homeTeam' | 'awayTeam'

type DbMatchRow = {
  id: string
  matchNum: string | null
  homeTeam: string
  awayTeam: string
  isFinished: boolean
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

export function getUnresolvedKnockoutPlaceholderResets(
  schedule: ScheduleRow[],
  dbMatches: DbMatchRow[]
): PlaceholderReset[] {
  const dbByMatchNum = new Map(
    dbMatches.flatMap((m) => (m.matchNum ? [[m.matchNum, m] as const] : []))
  )
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
      if (!feeder || feeder.isFinished) continue
      if (db[slot] === placeholder) continue

      resets.push({ matchId: db.id, slot, team: placeholder })
    }
  }

  return resets
}

export function getCanonicalSchedule(): ScheduleRow[] {
  return buildMatchScheduleFromCsv()
}
