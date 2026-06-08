import { describe, expect, it } from 'vitest'
import { groupAMatches, groupBMatches } from './__fixtures__/groupMatches'
import { buildAllGroupStandings } from './groupStandings'
import { resolveR32TeamName } from './r32Update'

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
