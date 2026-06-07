import { describe, expect, it } from 'vitest'
import { groupAMatches, groupBMatches } from './__fixtures__/groupMatches'
import {
  applyBracketUpdates,
  getKnockoutBracketUpdates,
  getKnockoutOutcome,
  getR32PlaceholderUpdates,
} from './bracket'
import { buildAllGroupStandings } from './groupStandings'

describe('knockout bracket propagation', () => {
  it('advances regulation winner to the linked next match', () => {
    const updates = getKnockoutBracketUpdates({
      id: 'm73',
      stage: 'R32',
      homeTeam: 'Mexico',
      awayTeam: 'Canada',
      homeScore: 2,
      awayScore: 1,
      nextMatchId: 'm90',
      nextMatchSlot: 'HOME',
    })

    expect(updates).toEqual([{ matchId: 'm90', slot: 'HOME', team: 'Mexico' }])
  })

  it('advances PK winner on a knockout draw', () => {
    const updates = getKnockoutBracketUpdates({
      id: 'm78',
      stage: 'R32',
      homeTeam: 'France',
      awayTeam: 'Germany',
      homeScore: 1,
      awayScore: 1,
      pkHomeScore: 4,
      pkAwayScore: 5,
      nextMatchId: 'm91',
      nextMatchSlot: 'AWAY',
    })

    expect(updates).toEqual([{ matchId: 'm91', slot: 'AWAY', team: 'Germany' }])
  })

  it('sends semifinal losers to the third-place match', () => {
    const updates = getKnockoutBracketUpdates({
      id: 'm101',
      stage: 'SF',
      homeTeam: 'Spain',
      awayTeam: 'Brazil',
      homeScore: 0,
      awayScore: 2,
      nextMatchId: 'm104',
      nextMatchSlot: 'HOME',
      loserNextMatchId: 'm103',
      loserNextMatchSlot: 'HOME',
    })

    expect(updates).toEqual([
      { matchId: 'm104', slot: 'HOME', team: 'Brazil' },
      { matchId: 'm103', slot: 'HOME', team: 'Spain' },
    ])
  })

  it('does not propagate group-stage draws', () => {
    const outcome = getKnockoutOutcome({
      id: 'm1',
      stage: 'GROUP',
      homeTeam: 'Mexico',
      awayTeam: 'South Africa',
      homeScore: 1,
      awayScore: 1,
    })

    expect(outcome).toEqual({ winner: null, loser: null })
  })
})

describe('R32 placeholder propagation', () => {
  it('fills group placeholders once both groups are complete', () => {
    const standings = buildAllGroupStandings([...groupAMatches(), ...groupBMatches()])
    const r32Matches = [{ id: 'm73', homeTeam: '2A', awayTeam: '2B' }]

    const updates = getR32PlaceholderUpdates(r32Matches, standings)
    expect(updates).toEqual([
      { matchId: 'm73', slot: 'HOME', team: 'South Korea' },
      { matchId: 'm73', slot: 'AWAY', team: 'Switzerland' },
    ])
  })
})

describe('full-stage propagation chain', () => {
  it('group stage -> R32 -> R16 updates in sequence', () => {
    let matches = [
      { id: 'm73', stage: 'R32', homeTeam: '2A', awayTeam: '2B', homeScore: 0, awayScore: 0 },
      { id: 'm90', stage: 'R16', homeTeam: 'W73', awayTeam: 'W75', homeScore: 0, awayScore: 0 },
      { id: 'm75', stage: 'R32', homeTeam: 'France', awayTeam: 'Germany', homeScore: 0, awayScore: 0, nextMatchId: 'm90', nextMatchSlot: 'AWAY' },
    ]

    // Step 1: group standings fill R32 placeholders
    const standings = buildAllGroupStandings([...groupAMatches(), ...groupBMatches()])
    matches = applyBracketUpdates(matches, getR32PlaceholderUpdates(matches, standings))

    const r32Match = matches.find((m) => m.id === 'm73')!
    expect(r32Match.homeTeam).toBe('South Korea')
    expect(r32Match.awayTeam).toBe('Switzerland')

    // Step 2: R32 result advances winner into R16 W73 slot
    const r32Result = {
      ...r32Match,
      stage: 'R32',
      homeScore: 2,
      awayScore: 0,
      nextMatchId: 'm90',
      nextMatchSlot: 'HOME',
    }
    matches = applyBracketUpdates(matches, getKnockoutBracketUpdates(r32Result))

    expect(matches.find((m) => m.id === 'm90')!.homeTeam).toBe('South Korea')

    // Step 3: other R32 feeds the away side of the same R16 match
    const otherR32 = matches.find((m) => m.id === 'm75')!
    matches = applyBracketUpdates(
      matches,
      getKnockoutBracketUpdates({
        ...otherR32,
        stage: 'R32',
        homeScore: 1,
        awayScore: 1,
        pkHomeScore: 3,
        pkAwayScore: 4,
      })
    )

    expect(matches.find((m) => m.id === 'm90')).toEqual({
      id: 'm90',
      stage: 'R16',
      homeTeam: 'South Korea',
      awayTeam: 'Germany',
      homeScore: 0,
      awayScore: 0,
    })
  })
})
