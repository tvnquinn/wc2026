import { describe, expect, it } from 'vitest'
import { resolveMatchNumById } from './matchNumResolution'
import type { ScheduleRow } from './seedMatches'

function dbRow(id: string, matchNum: string | null, kickoff: string) {
  return { id, matchNum, kickoffTime: new Date(kickoff) }
}

function csvRow(matchNum: string, kickoff: string): ScheduleRow {
  return {
    id: `csv-${matchNum}`,
    stage: 'GROUP',
    matchNum,
    homeTeam: 'A',
    awayTeam: 'B',
    kickoffTime: new Date(kickoff),
    nextMatchId: null,
    nextMatchSlot: null,
    loserNextMatchId: null,
    loserNextMatchSlot: null,
  }
}

describe('resolveMatchNumById', () => {
  it('uses stored matchNum when present', () => {
    const schedule = [csvRow('25', '2026-06-18T12:00:00-04:00')]
    const db = [dbRow('db1', '25', '2026-06-18T12:00:00-04:00')]
    expect(resolveMatchNumById(db, schedule).get('db1')).toBe('25')
  })

  it('pairs by kickoff order when matchNum is missing', () => {
    const schedule = [
      csvRow('24', '2026-06-18T09:00:00-04:00'),
      csvRow('25', '2026-06-18T12:00:00-04:00'),
      csvRow('26', '2026-06-18T15:00:00-04:00'),
    ]
    const db = [
      dbRow('a', null, '2026-06-18T09:00:00-04:00'),
      dbRow('b', null, '2026-06-18T12:00:00-04:00'),
      dbRow('c', null, '2026-06-18T15:00:00-04:00'),
    ]
    const resolved = resolveMatchNumById(db, schedule)
    expect(resolved.get('a')).toBe('24')
    expect(resolved.get('b')).toBe('25')
    expect(resolved.get('c')).toBe('26')
  })

  it('does not reuse CSV rows already claimed by stored matchNum', () => {
    const schedule = [
      csvRow('25', '2026-06-18T12:00:00-04:00'),
      csvRow('26', '2026-06-18T15:00:00-04:00'),
    ]
    const db = [
      dbRow('known', '25', '2026-06-18T12:00:00-04:00'),
      dbRow('unknown', null, '2026-06-18T15:00:00-04:00'),
    ]
    const resolved = resolveMatchNumById(db, schedule)
    expect(resolved.get('unknown')).toBe('26')
  })
})
