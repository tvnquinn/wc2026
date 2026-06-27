import { describe, expect, it } from 'vitest'
import { resolveMatchNumById, matchNumUpdatesNeeded } from './matchNumResolution'
import type { ScheduleRow } from './seedMatches'

function dbRow(
  id: string,
  matchNum: string | null,
  kickoff: string,
  homeTeam?: string,
  awayTeam?: string
) {
  return { id, matchNum, kickoffTime: new Date(kickoff), homeTeam, awayTeam }
}

function csvRow(
  matchNum: string,
  kickoff: string,
  homeTeam = 'A',
  awayTeam = 'B'
): ScheduleRow {
  return {
    id: `csv-${matchNum}`,
    stage: 'GROUP',
    matchNum,
    homeTeam,
    awayTeam,
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

  it('pairs by team names when kickoff times collide', () => {
    const kick = '2026-06-27T00:00:00.000Z'
    const schedule = [
      csvRow('65', kick, 'Cape Verde', 'Saudi Arabia'),
      csvRow('66', kick, 'Uruguay', 'Spain'),
    ]
    const db = [
      dbRow('db-u', '65', kick, 'Uruguay', 'Spain'),
      dbRow('db-c', '66', kick, 'Cape Verde', 'Saudi Arabia'),
    ]
    const resolved = resolveMatchNumById(db, schedule)
    expect(resolved.get('db-u')).toBe('66')
    expect(resolved.get('db-c')).toBe('65')
  })
})

describe('matchNumUpdatesNeeded', () => {
  it('flags swapped matchNum rows for correction', () => {
    const kick = '2026-06-27T00:00:00.000Z'
    const schedule = [
      csvRow('65', kick, 'Cape Verde', 'Saudi Arabia'),
      csvRow('66', kick, 'Uruguay', 'Spain'),
    ]
    const db = [
      dbRow('db-u', '65', kick, 'Uruguay', 'Spain'),
      dbRow('db-c', '66', kick, 'Cape Verde', 'Saudi Arabia'),
    ]
    const resolved = resolveMatchNumById(db, schedule)
    const updates = matchNumUpdatesNeeded(db, resolved)
    expect(updates).toEqual([
      { id: 'db-u', matchNum: '66' },
      { id: 'db-c', matchNum: '65' },
    ])
  })
})
