import { prisma } from '@/lib/prisma'
import { buildMatchScheduleFromCsv, type ScheduleRow } from '@/lib/seedMatches'

export type MatchWithKickoff = {
  id: string
  matchNum: string | null
  kickoffTime: Date
  homeTeam?: string
  awayTeam?: string
}

function teamKey(homeTeam?: string, awayTeam?: string): string | null {
  if (!homeTeam?.trim() || !awayTeam?.trim()) return null
  return `${homeTeam.trim()}|${awayTeam.trim()}`
}

function teamsMatch(
  db: Pick<MatchWithKickoff, 'homeTeam' | 'awayTeam'>,
  csv: Pick<ScheduleRow, 'homeTeam' | 'awayTeam'>
): boolean {
  return teamKey(db.homeTeam, db.awayTeam) === teamKey(csv.homeTeam, csv.awayTeam)
}

/** Map each DB match id → canonical matchNum from CSV (teams, stored matchNum, or kickoff order). */
export function resolveMatchNumById(
  dbMatches: MatchWithKickoff[],
  schedule?: ScheduleRow[]
): Map<string, string> {
  const canonical = schedule ?? buildMatchScheduleFromCsv()
  const csvByNum = new Map(canonical.map((m) => [m.matchNum, m]))
  const csvByTeams = new Map<string, ScheduleRow>()
  for (const row of canonical) {
    const key = teamKey(row.homeTeam, row.awayTeam)
    if (key) csvByTeams.set(key, row)
  }

  const csvByKickoff = [...canonical].sort(
    (a, b) => a.kickoffTime.getTime() - b.kickoffTime.getTime()
  )
  const dbByKickoff = [...dbMatches].sort(
    (a, b) => a.kickoffTime.getTime() - b.kickoffTime.getTime()
  )

  const byId = new Map<string, string>()
  const usedCsv = new Set<string>()

  if (csvByKickoff.length !== dbByKickoff.length) {
    for (const m of dbMatches) {
      if (m.matchNum?.trim()) byId.set(m.id, m.matchNum.trim())
    }
    return byId
  }

  for (const db of dbMatches) {
    const key = teamKey(db.homeTeam, db.awayTeam)
    const csvRow = key ? csvByTeams.get(key) : undefined
    if (csvRow && !usedCsv.has(csvRow.matchNum)) {
      byId.set(db.id, csvRow.matchNum)
      usedCsv.add(csvRow.matchNum)
    }
  }

  for (const db of dbByKickoff) {
    const stored = db.matchNum?.trim()
    if (byId.has(db.id)) continue
    if (stored && csvByNum.has(stored) && teamsMatch(db, csvByNum.get(stored)!)) {
      byId.set(db.id, stored)
      usedCsv.add(stored)
    }
  }

  for (const db of dbByKickoff) {
    if (byId.has(db.id)) continue
    const csvRow = csvByKickoff.find((row) => !usedCsv.has(row.matchNum))
    if (csvRow) {
      byId.set(db.id, csvRow.matchNum)
      usedCsv.add(csvRow.matchNum)
    }
  }

  return byId
}

/** Persist missing or incorrect Match.matchNum from matches.csv. */
export async function ensureMatchNumsBackfilled(): Promise<void> {
  const dbMatches = await prisma.match.findMany({
    select: { id: true, matchNum: true, kickoffTime: true, homeTeam: true, awayTeam: true },
  })

  const resolved = resolveMatchNumById(dbMatches)
  const updates = dbMatches
    .map((m) => {
      const matchNum = resolved.get(m.id)
      if (!matchNum || m.matchNum?.trim() === matchNum) return null
      return { id: m.id, matchNum }
    })
    .filter((row): row is { id: string; matchNum: string } => row != null)

  if (updates.length === 0) return

  await prisma.$transaction(
    updates.map(({ id, matchNum }) =>
      prisma.match.update({ where: { id }, data: { matchNum } })
    )
  )
}
