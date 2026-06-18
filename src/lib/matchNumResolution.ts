import { prisma } from '@/lib/prisma'
import { buildMatchScheduleFromCsv, type ScheduleRow } from '@/lib/seedMatches'

export type MatchWithKickoff = {
  id: string
  matchNum: string | null
  kickoffTime: Date
}

/** Map each DB match id → canonical matchNum from CSV (by stored matchNum or kickoff order). */
export function resolveMatchNumById(
  dbMatches: MatchWithKickoff[],
  schedule?: ScheduleRow[]
): Map<string, string> {
  const canonical = schedule ?? buildMatchScheduleFromCsv()
  const csvByNum = new Map(canonical.map((m) => [m.matchNum, m]))
  const csvByKickoff = [...canonical].sort(
    (a, b) => a.kickoffTime.getTime() - b.kickoffTime.getTime()
  )
  const dbByKickoff = [...dbMatches].sort(
    (a, b) => a.kickoffTime.getTime() - b.kickoffTime.getTime()
  )

  const byId = new Map<string, string>()

  if (csvByKickoff.length !== dbByKickoff.length) {
    for (const m of dbMatches) {
      if (m.matchNum?.trim()) byId.set(m.id, m.matchNum.trim())
    }
    return byId
  }

  const usedCsv = new Set<string>()

  for (const db of dbByKickoff) {
    const stored = db.matchNum?.trim()
    if (stored && csvByNum.has(stored)) {
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

/** Persist missing matchNum values from matches.csv (kickoff-order pairing). */
export async function ensureMatchNumsBackfilled(): Promise<void> {
  const dbMatches = await prisma.match.findMany({
    select: { id: true, matchNum: true, kickoffTime: true },
  })

  const resolved = resolveMatchNumById(dbMatches)
  const updates = dbMatches
    .filter((m) => !m.matchNum?.trim())
    .map((m) => {
      const matchNum = resolved.get(m.id)
      return matchNum ? { id: m.id, matchNum } : null
    })
    .filter((row): row is { id: string; matchNum: string } => row != null)

  if (updates.length === 0) return

  await prisma.$transaction(
    updates.map(({ id, matchNum }) =>
      prisma.match.update({ where: { id }, data: { matchNum } })
    )
  )
}
