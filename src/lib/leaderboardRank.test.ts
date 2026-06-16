import { describe, expect, it } from 'vitest'
import { assignCompetitionRanks } from './leaderboardRank'

describe('assignCompetitionRanks', () => {
  it('uses competition ranking for ties', () => {
    const ranked = assignCompetitionRanks([
      { name: 'Casey', totalPoints: 13 },
      { name: 'cocopirlo', totalPoints: 12 },
      { name: 'Tây Tây', totalPoints: 11 },
      { name: 'Wirtz', totalPoints: 11 },
      { name: 'Lucky Dragon', totalPoints: 11 },
      { name: 'Mẹ Lan', totalPoints: 10 },
      { name: 'CR7', totalPoints: 6 },
    ])

    expect(ranked.map((r) => ({ name: r.name, rank: r.rank }))).toEqual([
      { name: 'Casey', rank: 1 },
      { name: 'cocopirlo', rank: 2 },
      { name: 'Tây Tây', rank: 3 },
      { name: 'Wirtz', rank: 3 },
      { name: 'Lucky Dragon', rank: 3 },
      { name: 'Mẹ Lan', rank: 6 },
      { name: 'CR7', rank: 7 },
    ])
  })
})
