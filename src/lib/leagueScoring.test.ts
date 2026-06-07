import { describe, expect, it } from 'vitest'
import {
  isScoredForLeague,
  resolveEffectiveResult,
  type MatchResultFields,
} from './effectiveResults'
import { GLOBAL_SCORER_SLUG, isGlobalScorerLeague } from './league'
import { computePredictionPoints } from './scoring'

function leaguePoints(
  global: MatchResultFields,
  override: MatchResultFields | null,
  pred: { homeScore: number; awayScore: number; pkHomeScore: number | null; pkAwayScore: number | null },
  stage = 'GROUP'
) {
  if (!isScoredForLeague({ global, override })) return 0
  const effective = resolveEffectiveResult({ global, override })
  return computePredictionPoints(
    stage,
    effective.homeScore!,
    effective.awayScore!,
    effective.pkHomeScore,
    effective.pkAwayScore,
    pred
  )
}

const blankGlobal: MatchResultFields = {
  homeScore: null,
  awayScore: null,
  pkHomeScore: null,
  pkAwayScore: null,
  isFinished: false,
}

const globalTwoOne: MatchResultFields = {
  homeScore: 2,
  awayScore: 1,
  pkHomeScore: null,
  pkAwayScore: null,
  isFinished: true,
}

const leagueOverrideThreeZero: MatchResultFields = {
  homeScore: 3,
  awayScore: 0,
  pkHomeScore: null,
  pkAwayScore: null,
  isFinished: true,
}

describe('global scorer policy', () => {
  it('sleepwell is the only league slug that writes global scores', () => {
    expect(GLOBAL_SCORER_SLUG).toBe('sleepwell')
    expect(isGlobalScorerLeague('sleepwell')).toBe(true)
    expect(isGlobalScorerLeague('my-friends')).toBe(false)
    expect(isGlobalScorerLeague('')).toBe(false)
  })
})

describe('league scoring with global + override precedence', () => {
  it('awards 0 points when neither global nor override is set', () => {
    expect(
      leaguePoints(blankGlobal, null, { homeScore: 2, awayScore: 1, pkHomeScore: null, pkAwayScore: null })
    ).toBe(0)
    expect(isScoredForLeague({ global: blankGlobal, override: null })).toBe(false)
  })

  it('uses sleepwell global scores when a league has no override', () => {
    const pred = { homeScore: 2, awayScore: 1, pkHomeScore: null, pkAwayScore: null }
    expect(leaguePoints(globalTwoOne, null, pred)).toBe(3)
  })

  it('uses league override when set before global is filled', () => {
    const pred = { homeScore: 3, awayScore: 0, pkHomeScore: null, pkAwayScore: null }
    expect(leaguePoints(blankGlobal, leagueOverrideThreeZero, pred)).toBe(3)
    expect(isScoredForLeague({ global: blankGlobal, override: leagueOverrideThreeZero })).toBe(true)
  })

  it('keeps league override when sleepwell later sets a different global score', () => {
    const pred = { homeScore: 3, awayScore: 0, pkHomeScore: null, pkAwayScore: null }
    expect(leaguePoints(globalTwoOne, leagueOverrideThreeZero, pred)).toBe(3)

    const wrongForOverride = { homeScore: 0, awayScore: 3, pkHomeScore: null, pkAwayScore: null }
    expect(leaguePoints(globalTwoOne, leagueOverrideThreeZero, wrongForOverride)).toBe(0)
  })

  it('scores correct-winner points against global when no override exists', () => {
    const pred = { homeScore: 3, awayScore: 1, pkHomeScore: null, pkAwayScore: null }
    expect(leaguePoints(globalTwoOne, null, pred)).toBe(1)
  })

  it('does not treat unfinished global as scored when league has no override', () => {
    const unfinishedGlobal: MatchResultFields = {
      homeScore: 2,
      awayScore: 1,
      pkHomeScore: null,
      pkAwayScore: null,
      isFinished: false,
    }
    expect(isScoredForLeague({ global: unfinishedGlobal, override: null })).toBe(false)
  })
})
