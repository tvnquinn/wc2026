import { describe, expect, it } from 'vitest'
import { groupAMatches, groupBMatches } from './__fixtures__/groupMatches'
import { buildAllGroupStandings } from './groupStandings'
import { getCanonicalR32Schedule, pairR32WithCanonical, resolveR32TeamName } from './r32Update'

describe('resolveR32TeamName', () => {
  it('keeps placeholders until the full group stage is complete', () => {
    const standings = buildAllGroupStandings([...groupAMatches(), ...groupBMatches()])

    expect(resolveR32TeamName('2A', null)).toBe('2A')
    expect(resolveR32TeamName('2B', null)).toBe('2B')
    expect(resolveR32TeamName('3AB', null)).toBe('3AB')
    expect(resolveR32TeamName('2A', standings)).toBe('South Korea')
    expect(resolveR32TeamName('2B', standings)).toBe('Switzerland')
  })
})

describe('pairR32WithCanonical', () => {
  it('pairs by kickoff order when matchNum is missing in the database', () => {
    const csv = getCanonicalR32Schedule().slice(0, 2)
    const db = csv.map((row, index) => ({
      id: `db-${index}`,
      matchNum: null,
      homeTeam: 'Mexico',
      awayTeam: 'Canada',
      kickoffTime: row.kickoffTime,
    }))

    const pairs = pairR32WithCanonical(db, csv)
    expect(pairs).toHaveLength(2)
    expect(pairs[0].canonical.matchNum).toBe(csv[0].matchNum)
    expect(pairs[1].canonical.matchNum).toBe(csv[1].matchNum)
  })
})
