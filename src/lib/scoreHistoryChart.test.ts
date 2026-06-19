import { describe, expect, it } from 'vitest'
import {
  buildScoreHistoryChartData,
  jackpotPayoutsByMatchNum,
} from './scoreHistoryChart'
import type { JackpotEvent } from './jackpot'

const t = (iso: string) => new Date(iso)

describe('jackpotPayoutsByMatchNum', () => {
  it('maps payout events by match number', () => {
    const events: JackpotEvent[] = [
      { type: 'contribution', matchNum: '28', amount: 2, potAfter: 8 },
      { type: 'payout', matchNum: '28', userId: 'u-coco', amount: 8 },
    ]
    expect(jackpotPayoutsByMatchNum(events).get('28')).toEqual({
      userId: 'u-coco',
      amount: 8,
    })
  })
})

describe('buildScoreHistoryChartData', () => {
  const users = [
    {
      id: 'u-coco',
      name: 'cocopirlo',
      predictions: [
        { matchId: 'm-pre', points: 19 },
        { matchId: 'm28', points: 3 },
      ],
    },
    {
      id: 'u-other',
      name: 'Tây Tây',
      predictions: [
        { matchId: 'm-pre', points: 20 },
        { matchId: 'm28', points: 1 },
      ],
    },
  ]

  const finishedMatches = [
    { id: 'm-pre', matchNum: '24', kickoffTime: t('2026-06-17T16:00:00.000Z') },
    { id: 'm28', matchNum: '28', kickoffTime: t('2026-06-18T23:00:00.000Z') },
  ]

  it('includes jackpot payout on the match kickoff day', () => {
    const payouts = new Map([['28', { userId: 'u-coco', amount: 8 }]])
    const chart = buildScoreHistoryChartData({
      users,
      finishedMatches,
      jackpotPayoutsByMatchNum: payouts,
    })

    expect(chart).toHaveLength(3)
    expect(chart[0]).toEqual({ name: 'Start', cocopirlo: 0, 'Tây Tây': 0 })
    expect(chart[1]).toEqual({ name: '6/17', cocopirlo: 19, 'Tây Tây': 20 })
    expect(chart[2]).toEqual({ name: '6/18', cocopirlo: 30, 'Tây Tây': 21 })
  })

  it('accumulates multiple jackpot payouts on different days', () => {
    const usersMulti = [
      {
        id: 'u1',
        name: 'Player',
        predictions: [
          { matchId: 'm25', points: 3 },
          { matchId: 'm40', points: 1 },
        ],
      },
    ]
    const matchesMulti = [
      { id: 'm25', matchNum: '25', kickoffTime: t('2026-06-18T16:00:00.000Z') },
      { id: 'm40', matchNum: '40', kickoffTime: t('2026-06-20T16:00:00.000Z') },
    ]
    const payouts = new Map([
      ['25', { userId: 'u1', amount: 8 }],
      ['40', { userId: 'u1', amount: 10 }],
    ])

    const chart = buildScoreHistoryChartData({
      users: usersMulti,
      finishedMatches: matchesMulti,
      jackpotPayoutsByMatchNum: payouts,
    })

    expect(chart[1]).toEqual({ name: '6/18', Player: 11 })
    expect(chart[2]).toEqual({ name: '6/20', Player: 22 })
  })

  it('leaves scores unchanged when there are no jackpot payouts', () => {
    const chart = buildScoreHistoryChartData({
      users,
      finishedMatches,
      jackpotPayoutsByMatchNum: new Map(),
    })

    expect(chart[2]).toEqual({ name: '6/18', cocopirlo: 22, 'Tây Tây': 21 })
  })
})
