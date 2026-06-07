import { describe, expect, it } from 'vitest'
import {
  getGroupLetterForTeams,
  isGroupPlaceholder,
  resolvePlayoffPlaceholder,
} from './groups'

describe('groups', () => {
  it('identifies group placeholders', () => {
    expect(isGroupPlaceholder('1A')).toBe(true)
    expect(isGroupPlaceholder('2F')).toBe(true)
    expect(isGroupPlaceholder('3ABCDF')).toBe(true)
    expect(isGroupPlaceholder('W73')).toBe(false)
    expect(isGroupPlaceholder('Mexico')).toBe(false)
  })

  it('maps teams to the correct group', () => {
    expect(getGroupLetterForTeams('Mexico', 'South Africa')).toBe('A')
    expect(getGroupLetterForTeams('Canada', 'Qatar')).toBe('B')
    expect(getGroupLetterForTeams('England', 'Croatia')).toBe('L')
  })

  it('supports playoff placeholder teams in group squads', () => {
    expect(getGroupLetterForTeams('South Korea', 'UEFA D')).toBe('A')
    expect(getGroupLetterForTeams('Canada', 'UEFA A')).toBe('B')
    expect(getGroupLetterForTeams('Australia', 'UEFA C')).toBe('D')
    expect(getGroupLetterForTeams('Netherlands', 'UEFA B')).toBe('F')
  })

  it('resolves playoff placeholders to confirmed team names', () => {
    expect(resolvePlayoffPlaceholder('UEFA A')).toBe('Bosnia and Herzegovina')
    expect(resolvePlayoffPlaceholder('UEFA B')).toBe('Sweden')
    expect(resolvePlayoffPlaceholder('UEFA C')).toBe('Türkiye')
    expect(resolvePlayoffPlaceholder('UEFA D')).toBe('Czechia')
    expect(resolvePlayoffPlaceholder('Mexico')).toBe('Mexico')
  })
})
