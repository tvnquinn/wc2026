import { describe, expect, it } from 'vitest'
import { groupAMatches, groupBMatches, incompleteGroupAMatches } from './__fixtures__/groupMatches'
import {
  buildAllGroupStandings,
  computeGroupStandings,
  getGroupMatches,
  isGroupComplete,
  resolvePlaceholder,
} from './groupStandings'

describe('groupStandings', () => {
  it('requires all 6 group matches before standings are final', () => {
    const partial = getGroupMatches(incompleteGroupAMatches(), 'A')
    expect(partial).toHaveLength(5)
    expect(isGroupComplete(partial)).toBe(false)
    expect(computeGroupStandings(partial)).toBeNull()
  })

  it('ranks Group A correctly after all matches finish', () => {
    const matches = getGroupMatches(groupAMatches(), 'A')
    expect(isGroupComplete(matches)).toBe(true)

    const standings = computeGroupStandings(matches)
    expect(standings).not.toBeNull()
    expect(standings!.map((r) => r.team)).toEqual([
      'Mexico',
      'South Korea',
      'Czechia',
      'South Africa',
    ])
    expect(standings![0].points).toBe(9)
    expect(standings![1].points).toBe(4)
  })

  it('ranks Group B correctly after all matches finish', () => {
    const matches = getGroupMatches(groupBMatches(), 'B')
    const standings = computeGroupStandings(matches)

    expect(standings!.map((r) => r.team)).toEqual([
      'Canada',
      'Switzerland',
      'Qatar',
      'Bosnia and Herzegovina',
    ])
  })

  it('resolves 1X and 2X placeholders from standings', () => {
    const allMatches = [...groupAMatches(), ...groupBMatches()]
    const standingsByGroup = buildAllGroupStandings(allMatches)

    expect(resolvePlaceholder('1A', standingsByGroup)).toBe('Mexico')
    expect(resolvePlaceholder('2A', standingsByGroup)).toBe('South Korea')
    expect(resolvePlaceholder('1B', standingsByGroup)).toBe('Canada')
    expect(resolvePlaceholder('2B', standingsByGroup)).toBe('Switzerland')
  })

  it('returns null for placeholders when the group is incomplete', () => {
    const standingsByGroup = buildAllGroupStandings(incompleteGroupAMatches())
    expect(resolvePlaceholder('1A', standingsByGroup)).toBeNull()
    expect(resolvePlaceholder('2B', standingsByGroup)).toBeNull()
  })

  it('picks the best third-place team across a combination code', () => {
    const allMatches = [...groupAMatches(), ...groupBMatches()]
    const standingsByGroup = buildAllGroupStandings(allMatches)

    // Czechia (3 pts, gd -2) vs Qatar (3 pts, gd -3) -> Czechia advances
    expect(resolvePlaceholder('3AB', standingsByGroup)).toBe('Czechia')
  })
})
