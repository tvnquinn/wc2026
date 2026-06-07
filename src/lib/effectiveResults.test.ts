import { describe, expect, it } from 'vitest'
import { isScoredForLeague, matchDisplayForLeague, resolveEffectiveResult } from './effectiveResults'

const globalFinished = {
  homeScore: 2,
  awayScore: 1,
  pkHomeScore: null,
  pkAwayScore: null,
  isFinished: true,
}

const globalUnfinished = {
  homeScore: null,
  awayScore: null,
  pkHomeScore: null,
  pkAwayScore: null,
  isFinished: false,
}

describe('resolveEffectiveResult', () => {
  it('uses global result when no override', () => {
    const result = resolveEffectiveResult({
      global: globalFinished,
      override: null,
    })
    expect(result.homeScore).toBe(2)
    expect(result.awayScore).toBe(1)
  })

  it('uses league override when present even if global differs', () => {
    const result = resolveEffectiveResult({
      global: globalFinished,
      override: {
        homeScore: 0,
        awayScore: 0,
        pkHomeScore: 4,
        pkAwayScore: 3,
        isFinished: true,
      },
    })
    expect(result.homeScore).toBe(0)
    expect(result.pkHomeScore).toBe(4)
  })

  it('falls back to global when no override', () => {
    const result = resolveEffectiveResult({
      global: globalUnfinished,
      override: null,
    })
    expect(result.isFinished).toBe(false)
  })
})

describe('isScoredForLeague', () => {
  it('is true when global is finished with scores and no override', () => {
    expect(isScoredForLeague({ global: globalFinished, override: null })).toBe(true)
  })

  it('is true when league override is finished even if global is blank', () => {
    expect(
      isScoredForLeague({
        global: globalUnfinished,
        override: {
          homeScore: 1,
          awayScore: 0,
          pkHomeScore: null,
          pkAwayScore: null,
          isFinished: true,
        },
      })
    ).toBe(true)
  })

  it('is false when neither global nor override is finished', () => {
    expect(isScoredForLeague({ global: globalUnfinished, override: null })).toBe(false)
  })

  it('prefers override for scored state when global is also finished', () => {
    expect(
      isScoredForLeague({
        global: globalFinished,
        override: {
          homeScore: 0,
          awayScore: 0,
          pkHomeScore: 5,
          pkAwayScore: 4,
          isFinished: true,
        },
      })
    ).toBe(true)
  })

  it('is false when finished flag is set but scores are missing', () => {
    expect(
      isScoredForLeague({
        global: {
          homeScore: null,
          awayScore: 1,
          pkHomeScore: null,
          pkAwayScore: null,
          isFinished: true,
        },
        override: null,
      })
    ).toBe(false)
  })
})

describe('matchDisplayForLeague', () => {
  const baseMatch = {
    id: 'm1',
    homeTeam: 'A',
    awayTeam: 'B',
    homeScore: 2,
    awayScore: 1,
    pkHomeScore: null,
    pkAwayScore: null,
    isFinished: true,
  }

  it('shows league override instead of global on picks/leaderboard views', () => {
    const display = matchDisplayForLeague(baseMatch, {
      homeScore: 0,
      awayScore: 3,
      pkHomeScore: null,
      pkAwayScore: null,
      isFinished: true,
    })
    expect(display.homeScore).toBe(0)
    expect(display.awayScore).toBe(3)
    expect(display.isFinished).toBe(true)
  })

  it('falls back to global when league has no override', () => {
    const display = matchDisplayForLeague(baseMatch, null)
    expect(display.homeScore).toBe(2)
    expect(display.awayScore).toBe(1)
    expect(display.isFinished).toBe(true)
  })

  it('shows unscored when neither global nor override is finished', () => {
    const display = matchDisplayForLeague(
      { ...baseMatch, homeScore: null, awayScore: null, isFinished: false },
      null
    )
    expect(display.isFinished).toBe(false)
    expect(display.homeScore).toBeNull()
  })
})
