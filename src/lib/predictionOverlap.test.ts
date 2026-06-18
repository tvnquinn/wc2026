import { describe, expect, it } from 'vitest'
import {
  draftToScorePick,
  findOverlappingNames,
  formatOverlapMessage,
  predictionsMatch,
} from './predictionOverlap'

describe('predictionsMatch', () => {
  it('matches identical group scores', () => {
    const pick = { homeScore: 2, awayScore: 2, pkHomeScore: null, pkAwayScore: null }
    expect(predictionsMatch('GROUP', pick, pick)).toBe(true)
  })

  it('does not match different group scores', () => {
    const a = { homeScore: 2, awayScore: 2, pkHomeScore: null, pkAwayScore: null }
    const b = { homeScore: 1, awayScore: 1, pkHomeScore: null, pkAwayScore: null }
    expect(predictionsMatch('GROUP', a, b)).toBe(false)
  })

  it('matches knockout draws on regulation when PK not entered on either side', () => {
    const a = { homeScore: 1, awayScore: 1, pkHomeScore: null, pkAwayScore: null }
    const b = { homeScore: 1, awayScore: 1, pkHomeScore: null, pkAwayScore: null }
    expect(predictionsMatch('R32', a, b)).toBe(true)
  })

  it('requires matching PK when both sides entered PK on knockout draw', () => {
    const a = { homeScore: 1, awayScore: 1, pkHomeScore: 4, pkAwayScore: 3 }
    const b = { homeScore: 1, awayScore: 1, pkHomeScore: 5, pkAwayScore: 4 }
    expect(predictionsMatch('R32', a, b)).toBe(false)
  })
})

describe('findOverlappingNames', () => {
  it('excludes the current user', () => {
    const pick = { homeScore: 2, awayScore: 2, pkHomeScore: null, pkAwayScore: null }
    const names = findOverlappingNames('GROUP', pick, 'u1', [
      { userId: 'u1', name: 'Casey', pick },
      { userId: 'u2', name: 'Mẹ Lan', pick },
    ])
    expect(names).toEqual(['Mẹ Lan'])
  })
})

describe('formatOverlapMessage', () => {
  it('formats one, two, and many names', () => {
    expect(formatOverlapMessage(['A'])).toBe('Same guess as A')
    expect(formatOverlapMessage(['A', 'B'])).toBe('Same guess as A and B')
    expect(formatOverlapMessage(['A', 'B', 'C'])).toBe('Same guess as A, B, and C')
  })
})

describe('draftToScorePick', () => {
  it('parses complete draft strings', () => {
    expect(draftToScorePick('GROUP', { homeScore: '2', awayScore: '1', pkHomeScore: '', pkAwayScore: '' })).toEqual({
      homeScore: 2,
      awayScore: 1,
      pkHomeScore: null,
      pkAwayScore: null,
    })
  })

  it('returns null for incomplete draft', () => {
    expect(draftToScorePick('GROUP', { homeScore: '2', awayScore: '', pkHomeScore: '', pkAwayScore: '' })).toBeNull()
  })
})
