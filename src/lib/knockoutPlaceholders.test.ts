import { describe, expect, it } from 'vitest'
import { buildMatchScheduleFromCsv } from '@/lib/seedMatches'
import {
  getFeederMatchNum,
  getUnresolvedKnockoutPlaceholderResets,
} from '@/lib/knockoutPlaceholders'

describe('getFeederMatchNum', () => {
  it('maps winner and loser codes to feeder match numbers', () => {
    expect(getFeederMatchNum('W73')).toBe('73')
    expect(getFeederMatchNum('W75')).toBe('75')
    expect(getFeederMatchNum('L101')).toBe('101')
    expect(getFeederMatchNum('W191')).toBe('101')
  })

  it('returns null for real team names', () => {
    expect(getFeederMatchNum('Czechia')).toBeNull()
    expect(getFeederMatchNum('2A')).toBeNull()
  })
})

describe('getUnresolvedKnockoutPlaceholderResets', () => {
  it('resets stale team names when the feeder match is not finished', () => {
    const schedule = buildMatchScheduleFromCsv()
    const match90 = schedule.find((m) => m.matchNum === '90')!
    const match73 = schedule.find((m) => m.matchNum === '73')!

    expect(match90.homeTeam).toBe('W73')
    expect(match90.awayTeam).toBe('W75')

    const resets = getUnresolvedKnockoutPlaceholderResets(schedule, [
      {
        id: 'r32-73',
        matchNum: '73',
        homeTeam: '2A',
        awayTeam: '2B',
        isFinished: false,
        kickoffTime: new Date('2026-06-28T15:00:00-04:00'),
      },
      {
        id: 'r32-75',
        matchNum: '75',
        homeTeam: '1F',
        awayTeam: '2C',
        isFinished: false,
        kickoffTime: new Date('2026-06-29T21:00:00-04:00'),
      },
      {
        id: 'r16-90',
        matchNum: '90',
        homeTeam: 'Czechia',
        awayTeam: 'W75',
        isFinished: false,
        kickoffTime: new Date('2026-07-04T13:00:00-04:00'),
      },
    ])

    expect(resets).toContainEqual({
      matchId: 'r16-90',
      slot: 'homeTeam',
      team: 'W73',
    })
    expect(resets.some((r) => r.matchId === 'r16-90' && r.slot === 'awayTeam')).toBe(false)
  })

  it('keeps resolved teams once the feeder match is finished', () => {
    const schedule = buildMatchScheduleFromCsv()

    const resets = getUnresolvedKnockoutPlaceholderResets(schedule, [
      {
        id: 'r32-73',
        matchNum: '73',
        homeTeam: 'South Korea',
        awayTeam: 'Switzerland',
        isFinished: true,
        kickoffTime: new Date('2026-06-28T15:00:00-04:00'),
      },
      {
        id: 'r16-90',
        matchNum: '90',
        homeTeam: 'South Korea',
        awayTeam: 'W75',
        isFinished: false,
        kickoffTime: new Date('2026-07-04T13:00:00-04:00'),
      },
    ])

    expect(resets).toEqual([])
  })
})
