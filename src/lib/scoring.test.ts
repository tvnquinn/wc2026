import { describe, expect, it } from 'vitest'
import { computePredictionPoints } from './scoring'

type Pred = {
  homeScore: number
  awayScore: number
  pkHomeScore: number | null
  pkAwayScore: number | null
}

function pred(
  home: number,
  away: number,
  pkH: number | null = null,
  pkA: number | null = null
): Pred {
  return { homeScore: home, awayScore: away, pkHomeScore: pkH, pkAwayScore: pkA }
}

function points(
  stage: string,
  actual: { home: number; away: number; pkH?: number | null; pkA?: number | null },
  prediction: Pred
): number {
  return computePredictionPoints(
    stage,
    actual.home,
    actual.away,
    actual.pkH ?? null,
    actual.pkA ?? null,
    prediction
  )
}

describe('computePredictionPoints', () => {
  describe('group stage — regulation only', () => {
    it.each([
      ['G1 exact home win', { home: 2, away: 1 }, pred(2, 1), 3],
      ['G2 exact draw', { home: 1, away: 1 }, pred(1, 1), 3],
      ['G3 exact away win', { home: 0, away: 2 }, pred(0, 2), 3],
      ['G4 correct outcome home win', { home: 2, away: 1 }, pred(3, 0), 1],
      ['G5 correct outcome draw', { home: 1, away: 1 }, pred(0, 0), 1],
      ['G6 correct outcome away win', { home: 0, away: 2 }, pred(0, 1), 1],
      ['G7 wrong outcome predicted draw', { home: 2, away: 0 }, pred(1, 1), 0],
      ['G8 wrong outcome predicted home got away', { home: 1, away: 2 }, pred(2, 1), 0],
    ] as const)('%s', (_label, actual, prediction, expected) => {
      expect(points('GROUP', actual, prediction)).toBe(expected)
    })

    it('G9 exact score does not also award correct-outcome bonus', () => {
      expect(points('GROUP', { home: 2, away: 1 }, pred(2, 1))).toBe(3)
    })
  })

  describe('knockout stages — decisive result (no penalties)', () => {
    it.each([
      ['R32', 6, 2],
      ['R16', 12, 4],
      ['QF', 24, 8],
      ['SF', 48, 16],
      ['THIRD', 48, 16],
      ['FINAL', 96, 32],
    ] as const)('%s exact and correct-outcome points', (stage, exactPts, outcomePts) => {
      expect(points(stage, { home: 2, away: 1 }, pred(2, 1))).toBe(exactPts)
      expect(points(stage, { home: 2, away: 1 }, pred(3, 0))).toBe(outcomePts)
      expect(points(stage, { home: 2, away: 1 }, pred(0, 1))).toBe(0)
    })
  })

  describe('knockout stages — match went to penalties (R32)', () => {
    const pkActual = { home: 1, away: 1, pkH: 5, pkA: 3 }

    it.each([
      ['P1 exact reg + exact PK', pred(1, 1, 5, 3), 10],
      ['P2 exact reg + wrong PK score, correct PK winner', pred(1, 1, 4, 2), 6],
      ['P3 correct draw outcome + exact PK', pred(0, 0, 5, 3), 6],
      ['P4 correct draw outcome + wrong PK score', pred(0, 0, 4, 2), 2],
      ['P5 correct draw outcome + wrong PK winner', pred(0, 0, 3, 5), 0],
      ['P6 missing PK prediction', pred(0, 0, null, null), 0],
      ['P7 predicted decisive when match went to PK', pred(2, 0), 0],
    ] as const)('%s', (_label, prediction, expected) => {
      expect(points('R32', pkActual, prediction)).toBe(expected)
    })

    it('P8 0-0 PK exact reg without exact PK score earns exact only', () => {
      expect(points('R32', { home: 0, away: 0, pkH: 5, pkA: 4 }, pred(0, 0, 5, 3))).toBe(6)
    })

    it('P9 group draw does not apply penalty bonus', () => {
      expect(points('GROUP', { home: 1, away: 1 }, pred(1, 1))).toBe(3)
    })
  })

  describe('penalty bonus amounts by stage (exact reg + exact PK)', () => {
    it.each([
      ['R32', 10],
      ['R16', 20],
      ['QF', 40],
      ['SF', 80],
      ['THIRD', 80],
      ['FINAL', 160],
    ] as const)('%s awards exact + bonus total', (stage, expected) => {
      expect(points(stage, { home: 1, away: 1, pkH: 5, pkA: 3 }, pred(1, 1, 5, 3))).toBe(expected)
    })
  })

  describe('unknown stage', () => {
    it('returns 0 for exact, outcome, and wrong predictions', () => {
      expect(points('UNKNOWN', { home: 2, away: 1 }, pred(2, 1))).toBe(0)
      expect(points('UNKNOWN', { home: 2, away: 1 }, pred(3, 0))).toBe(0)
      expect(points('UNKNOWN', { home: 2, away: 1 }, pred(0, 1))).toBe(0)
    })
  })
})
