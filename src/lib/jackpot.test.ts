import { describe, expect, it } from 'vitest'
import {
  applyJackpotBatchSettlement,
  applyJackpotForMatch,
  isJackpotEligibleMatch,
  isJackpotWin,
  jackpotContribution,
  jackpotWinnersFromPredictions,
  replayJackpot,
  type JackpotActual,
  type JackpotMatchInput,
  type JackpotPrediction,
} from './jackpot'

function pred(
  userId: string,
  home: number,
  away: number,
  pkH: number | null = null,
  pkA: number | null = null
): JackpotPrediction {
  return { userId, homeScore: home, awayScore: away, pkHomeScore: pkH, pkAwayScore: pkA }
}

function actual(
  home: number,
  away: number,
  pkH: number | null = null,
  pkA: number | null = null,
  isFinished = true
): JackpotActual {
  return {
    homeScore: home,
    awayScore: away,
    pkHomeScore: pkH,
    pkAwayScore: pkA,
    isFinished,
  }
}

function matchRow(
  matchNum: string,
  stage: string,
  kickoff: Date,
  matchActual: JackpotActual,
  predictions: JackpotPrediction[]
): JackpotMatchInput {
  return { matchNum, stage, kickoffTime: kickoff, actual: matchActual, predictions }
}

describe('jackpotContribution', () => {
  it.each([
    ['GROUP', 2],
    ['R32', 4],
    ['R16', 6],
    ['QF', 8],
    ['SF', 10],
    ['THIRD', 10],
    ['FINAL', 12],
    ['UNKNOWN', 0],
    ['', 0],
  ] as const)('returns %i for stage %s', (stage, expected) => {
    expect(jackpotContribution(stage)).toBe(expected)
  })
})

describe('isJackpotEligibleMatch', () => {
  it.each([
    ['24', false],
    ['25', true],
    ['53', true],
    [null, false],
    ['', false],
    [undefined, false],
  ] as const)('matchNum %s → %s', (matchNum, expected) => {
    expect(isJackpotEligibleMatch(matchNum)).toBe(expected)
  })
})

describe('isJackpotWin', () => {
  describe('group stage', () => {
    it.each([
      [actual(2, 1), pred('u1', 2, 1), true],
      [actual(2, 1), pred('u1', 1, 1), false],
      [actual(1, 1), pred('u1', 1, 1), true],
      [actual(0, 0), pred('u1', 0, 0), true],
    ] as const)('group exact-score eligibility', (matchActual, prediction, expected) => {
      expect(isJackpotWin('GROUP', matchActual, prediction)).toBe(expected)
    })
  })

  describe('knockout decisive', () => {
    it.each([
      ['R32', actual(2, 1), pred('u1', 2, 1), true],
      ['R32', actual(2, 1), pred('u1', 1, 1, 5, 4), false],
      ['R16', actual(3, 0), pred('u1', 3, 0), true],
    ] as const)('knockout without shootout', (stage, matchActual, prediction, expected) => {
      expect(isJackpotWin(stage, matchActual, prediction)).toBe(expected)
    })
  })

  describe('knockout penalty draw', () => {
    const pkDrawActual = actual(1, 1, 5, 4)

    it.each([
      ['A', pred('u1', 1, 1, 3, 2), true],
      ['B', pred('u1', 1, 1, 5, 4), true],
      ['C', pred('u1', 1, 1, 4, 5), false],
      ['D', pred('u1', 2, 2, 5, 4), false],
      ['E', pred('u1', 2, 2, 3, 2), false],
    ] as const)('case %s', (_case, prediction, expected) => {
      expect(isJackpotWin('R32', pkDrawActual, prediction)).toBe(expected)
    })

    it.each([
      [pred('u1', 1, 1, null, null), false],
      [pred('u1', 1, 0), false],
      [pred('u1', 2, 1), true],
    ] as const)('additional PK edge cases (1-1 PK 5-4 actual)', (prediction, expected) => {
      if (prediction.homeScore === 2 && prediction.awayScore === 1) {
        expect(isJackpotWin('R32', actual(2, 1), prediction)).toBe(expected)
      } else {
        expect(isJackpotWin('R32', pkDrawActual, prediction)).toBe(expected)
      }
    })

    it.each([
      [actual(0, 0, 4, 3), pred('u1', 0, 0, 3, 4), false],
      [actual(0, 0, 3, 4), pred('u1', 0, 0, 2, 3), true],
    ] as const)('0-0 PK shootout winner side', (matchActual, prediction, expected) => {
      expect(isJackpotWin('R16', matchActual, prediction)).toBe(expected)
    })
  })

  it('returns false when match is not finished', () => {
    expect(isJackpotWin('GROUP', actual(2, 1, null, null, false), pred('u1', 2, 1))).toBe(false)
  })
})

describe('jackpotWinnersFromPredictions', () => {
  it('returns only eligible user ids and excludes non-winners', () => {
    const winners = jackpotWinnersFromPredictions(
      'GROUP',
      actual(2, 1),
      [pred('u1', 2, 1), pred('u2', 1, 0), pred('u3', 2, 1)]
    )
    expect(winners).toEqual(['u1', 'u3'])
  })
})

describe('applyJackpotBatchSettlement', () => {
  it('splits the pot evenly across simultaneous matches', () => {
    const outcome = applyJackpotBatchSettlement({
      pot: 4,
      matches: [
        { matchNum: '25', winnerUserIds: ['u1'] },
        { matchNum: '26', winnerUserIds: ['u2'] },
      ],
    })

    expect(outcome.pot).toBe(0)
    expect(outcome.payouts).toEqual([
      { matchNum: '25', userId: 'u1', amount: 2 },
      { matchNum: '26', userId: 'u2', amount: 2 },
    ])
    expect(outcome.rollovers).toEqual([])
  })

  it('lets one winner take the whole pot when they win every simultaneous match', () => {
    const outcome = applyJackpotBatchSettlement({
      pot: 4,
      matches: [
        { matchNum: '25', winnerUserIds: ['u1'] },
        { matchNum: '26', winnerUserIds: ['u1'] },
      ],
    })

    expect(outcome.pot).toBe(0)
    expect(outcome.payouts).toEqual([
      { matchNum: '25', userId: 'u1', amount: 2 },
      { matchNum: '26', userId: 'u1', amount: 2 },
    ])
  })

  it('pays only the winning match slice when the other simultaneous match has no winner', () => {
    const outcome = applyJackpotBatchSettlement({
      pot: 4,
      matches: [
        { matchNum: '25', winnerUserIds: ['u1'] },
        { matchNum: '26', winnerUserIds: [] },
      ],
    })

    expect(outcome.pot).toBe(0)
    expect(outcome.payouts).toEqual([{ matchNum: '25', userId: 'u1', amount: 4 }])
    expect(outcome.rollovers).toEqual([{ matchNum: '26', amount: 0, winnerCount: 0 }])
  })

  it('keeps the whole pot when nobody wins any simultaneous match', () => {
    const outcome = applyJackpotBatchSettlement({
      pot: 4,
      matches: [
        { matchNum: '25', winnerUserIds: [] },
        { matchNum: '26', winnerUserIds: [] },
      ],
    })

    expect(outcome.pot).toBe(4)
    expect(outcome.payouts).toEqual([])
    expect(outcome.rollovers).toHaveLength(2)
  })
})

describe('applyJackpotForMatch', () => {
    it.each([
      [{ pot: 0, contribution: 2, winnerUserIds: [] as string[] }, { pot: 2, payout: 0, winnerId: null }],
      [{ pot: 2, contribution: 2, winnerUserIds: [] as string[] }, { pot: 4, payout: 0, winnerId: null }],
      [{ pot: 4, contribution: 2, winnerUserIds: ['u1'] }, { pot: 0, payout: 6, winnerId: 'u1' }],
      [{ pot: 10, contribution: 4, winnerUserIds: ['u1', 'u2'] }, { pot: 14, payout: 0, winnerId: null }],
      [{ pot: 14, contribution: 6, winnerUserIds: ['u1', 'u2', 'u3'] }, { pot: 20, payout: 0, winnerId: null }],
      [{ pot: 8, contribution: 2, winnerUserIds: ['u1'] }, { pot: 0, payout: 10, winnerId: 'u1' }],
    ] as const)('payout state machine %#', (input, expected) => {
      expect(
        applyJackpotForMatch({
          pot: input.pot,
          contribution: input.contribution,
          winnerUserIds: [...input.winnerUserIds],
        })
      ).toEqual(expected)
  })
})

describe('replayJackpot', () => {
  const t = (day: number) => new Date(`2026-06-${String(day).padStart(2, '0')}T12:00:00Z`)

  const backfillFixture = (): JackpotMatchInput[] => [
    matchRow('24', 'GROUP', t(17), actual(1, 0), [pred('u1', 1, 0)]),
    matchRow('25', 'GROUP', t(18), actual(2, 1), [pred('u1', 0, 0)]),
    matchRow('26', 'GROUP', t(19), actual(1, 1), [pred('u1', 1, 1), pred('u2', 2, 2)]),
    matchRow('27', 'GROUP', t(20), actual(3, 0), [pred('u1', 3, 0), pred('u2', 3, 0)]),
    matchRow('28', 'GROUP', t(21), actual(0, 0, null, null, false), [pred('u1', 0, 0)]),
  ]

  describe('backfill from M25', () => {
    it('skips pre-M25, adds at kickoff, settles when finished', () => {
      const result = replayJackpot(backfillFixture(), { now: t(20) })

      expect(result.pot).toBe(2)
      expect(result.userWinnings).toEqual({ u1: 4 })
      expect(result.events).toHaveLength(6)
      expect(result.events[0]).toEqual({ type: 'contribution', matchNum: '25', amount: 2, potAfter: 2 })
      expect(result.events[1]).toEqual({ type: 'rollover', matchNum: '25', potAfter: 2, winnerCount: 0 })
      expect(result.events[2]).toEqual({ type: 'contribution', matchNum: '26', amount: 2, potAfter: 4 })
      expect(result.events[3]).toEqual({ type: 'payout', matchNum: '26', userId: 'u1', amount: 4 })
      expect(result.events[4]).toEqual({ type: 'contribution', matchNum: '27', amount: 2, potAfter: 2 })
      expect(result.events[5]).toEqual({ type: 'rollover', matchNum: '27', potAfter: 2, winnerCount: 2 })
    })
  })

  describe('kickoff contribution', () => {
    it('adds to pot when kickoff passes even before result is entered', () => {
      const matches = [
        matchRow('25', 'GROUP', t(18), actual(2, 1), []),
        matchRow('26', 'GROUP', t(19), actual(0, 0, null, null, false), []),
      ]

      const result = replayJackpot(matches, { now: t(20) })

      expect(result.pot).toBe(4)
      expect(result.userWinnings).toEqual({})
      expect(result.events).toEqual([
        { type: 'contribution', matchNum: '25', amount: 2, potAfter: 2 },
        { type: 'rollover', matchNum: '25', potAfter: 2, winnerCount: 0 },
        { type: 'contribution', matchNum: '26', amount: 2, potAfter: 4 },
      ])
    })

    it('skips matches whose kickoff is still in the future', () => {
      const matches = [matchRow('25', 'GROUP', t(18), actual(2, 1), [])]

      const result = replayJackpot(matches, { now: t(17) })

      expect(result.pot).toBe(0)
      expect(result.events).toEqual([])
    })
  })

  describe('skips pre-M25 and unfinished matches', () => {
    it('adds M26 kickoff contribution when M26 result is not in yet', () => {
      const matches = [
        matchRow('25', 'GROUP', t(18), actual(2, 1), []),
        matchRow('26', 'GROUP', t(19), actual(1, 1, null, null, false), [pred('u1', 1, 1)]),
      ]

      const result = replayJackpot(matches, { now: t(20) })

      expect(result.pot).toBe(4)
      expect(result.userWinnings).toEqual({})
      expect(result.events).toHaveLength(3)
    })
  })

  describe('recompute after result correction', () => {
    it('recomputes full replay when dual winners replace solo winner at M26', () => {
      const matches = backfillFixture()
      const corrected = matches.map((m) =>
        m.matchNum === '26'
          ? {
              ...m,
              predictions: [pred('u1', 1, 1), pred('u2', 1, 1)],
            }
          : m
      )

      const result = replayJackpot(corrected, { now: t(20) })

      expect(result.pot).toBe(6)
      expect(result.userWinnings).toEqual({})
      expect(result.events).toHaveLength(6)
      expect(result.events[1]).toEqual({ type: 'rollover', matchNum: '25', potAfter: 2, winnerCount: 0 })
      expect(result.events[3]).toEqual({ type: 'rollover', matchNum: '26', potAfter: 4, winnerCount: 2 })
      expect(result.events[5]).toEqual({ type: 'rollover', matchNum: '27', potAfter: 6, winnerCount: 2 })
    })

    it('re-runs from a match forward with fromMatchNum option', () => {
      const matches = backfillFixture()
      const corrected = matches.map((m) =>
        m.matchNum === '26'
          ? {
              ...m,
              predictions: [pred('u1', 1, 1), pred('u2', 1, 1)],
            }
          : m
      )

      const result = replayJackpot(corrected, { fromMatchNum: '26', now: t(20) })

      expect(result.pot).toBe(4)
      expect(result.userWinnings).toEqual({})
      expect(result.events).toHaveLength(4)
      expect(result.events[1]).toEqual({ type: 'rollover', matchNum: '26', potAfter: 2, winnerCount: 2 })
      expect(result.events[3]).toEqual({ type: 'rollover', matchNum: '27', potAfter: 4, winnerCount: 2 })
    })
  })

  describe('simultaneous kickoffs', () => {
    const sameKickoff = t(18)

    it('pays only the winning match slice when the other simultaneous match has no winner', () => {
      const matches = [
        matchRow('25', 'GROUP', sameKickoff, actual(1, 0), [pred('u1', 1, 0)]),
        matchRow('26', 'GROUP', sameKickoff, actual(2, 1), [pred('u2', 0, 0)]),
      ]

      const result = replayJackpot(matches, { now: t(19) })

      expect(result.pot).toBe(0)
      expect(result.userWinnings).toEqual({ u1: 4 })
    })

    it('splits the pot when different players win simultaneous matches', () => {
      const matches = [
        matchRow('25', 'GROUP', sameKickoff, actual(1, 0), [pred('u1', 1, 0)]),
        matchRow('26', 'GROUP', sameKickoff, actual(2, 1), [pred('u2', 2, 1)]),
      ]

      const result = replayJackpot(matches, { now: t(19) })

      expect(result.pot).toBe(0)
      expect(result.userWinnings).toEqual({ u1: 2, u2: 2 })
    })

    it('lets one player take the whole simultaneous pot when they win both matches', () => {
      const matches = [
        matchRow('25', 'GROUP', sameKickoff, actual(1, 0), [pred('u1', 1, 0)]),
        matchRow('26', 'GROUP', sameKickoff, actual(2, 1), [pred('u1', 2, 1)]),
      ]

      const result = replayJackpot(matches, { now: t(19) })

      expect(result.pot).toBe(0)
      expect(result.userWinnings).toEqual({ u1: 4 })
    })

    it('waits to settle until every simultaneous match has a result', () => {
      const matches = [
        matchRow('25', 'GROUP', sameKickoff, actual(1, 0), [pred('u1', 1, 0)]),
        matchRow('26', 'GROUP', sameKickoff, actual(0, 0, null, null, false), [pred('u2', 0, 0)]),
      ]

      const result = replayJackpot(matches, { now: t(19) })

      expect(result.pot).toBe(4)
      expect(result.userWinnings).toEqual({})
      expect(result.events.filter((event) => event.type === 'payout')).toHaveLength(0)
    })

    it('Uruguay vs Spain: solo winner takes whole pot when Cape Verde same slot has no winner', () => {
      const kick = new Date('2026-06-27T00:00:00.000Z')
      const matches = [
        matchRow('65', 'GROUP', kick, actual(0, 0), []),
        matchRow('66', 'GROUP', kick, actual(0, 1), [pred('u-tay', 0, 1)]),
      ]

      const result = replayJackpot(matches, { now: new Date('2026-06-27T12:00:00.000Z') })

      expect(result.userWinnings).toEqual({ 'u-tay': 4 })
      expect(result.pot).toBe(0)
    })
  })

  describe('lifetime jackpot winnings', () => {
    it('accumulates separate payouts when the same user wins multiple jackpots', () => {
      const t = (day: number) => new Date(`2026-06-${String(day).padStart(2, '0')}T12:00:00Z`)
      const matches = [
        matchRow('25', 'GROUP', t(18), actual(1, 0), [pred('u1', 1, 0)]),
        matchRow('26', 'GROUP', t(19), actual(2, 1), [pred('u2', 3, 0)]),
        matchRow('27', 'GROUP', t(20), actual(0, 1), [pred('u3', 1, 0)]),
        matchRow('28', 'GROUP', t(21), actual(3, 2), [pred('u1', 3, 2)]),
      ]

      const result = replayJackpot(matches, { now: t(22) })

      expect(result.userWinnings).toEqual({ u1: 8 })
      expect(result.pot).toBe(0)
    })
  })
})
