import {
  getPkWinnerSide,
  matchWentToPenalties,
  PENALTY_BONUS,
} from '@/lib/penalties'

const POINTS: Record<string, { exact: number; correctWinner: number }> = {
  GROUP: { exact: 3, correctWinner: 1 },
  R32: { exact: 6, correctWinner: 2 },
  R16: { exact: 9, correctWinner: 3 },
  QF: { exact: 12, correctWinner: 4 },
  SF: { exact: 15, correctWinner: 5 },
  THIRD: { exact: 15, correctWinner: 5 },
  FINAL: { exact: 21, correctWinner: 7 },
}

export function computePredictionPoints(
  stage: string,
  homeScore: number,
  awayScore: number,
  pkHome: number | null,
  pkAway: number | null,
  pred: { homeScore: number; awayScore: number; pkHomeScore: number | null; pkAwayScore: number | null }
): number {
  const stagePoints = POINTS[stage] || { exact: 0, correctWinner: 0 }
  const wentToPk = matchWentToPenalties(stage, homeScore, awayScore, pkHome, pkAway)

  const predDiff = pred.homeScore - pred.awayScore
  const predWinner = predDiff > 0 ? 'HOME' : predDiff < 0 ? 'AWAY' : 'DRAW'
  const actualDiff = homeScore - awayScore
  const actualWinner = actualDiff > 0 ? 'HOME' : actualDiff < 0 ? 'AWAY' : 'DRAW'

  if (wentToPk && predWinner === 'DRAW') {
    if (pred.pkHomeScore == null || pred.pkAwayScore == null) return 0
    const predPkWinner = getPkWinnerSide(pred.pkHomeScore, pred.pkAwayScore)
    const actualPkWinner = getPkWinnerSide(pkHome!, pkAway!)
    if (!predPkWinner || !actualPkWinner || predPkWinner !== actualPkWinner) return 0

    let earned = 0
    if (pred.homeScore === homeScore && pred.awayScore === awayScore) {
      earned = stagePoints.exact
    } else if (predWinner === actualWinner) {
      earned = stagePoints.correctWinner
    }

    if (pred.pkHomeScore === pkHome && pred.pkAwayScore === pkAway) {
      earned += PENALTY_BONUS[stage] || 0
    }
    return earned
  }

  if (pred.homeScore === homeScore && pred.awayScore === awayScore) {
    return stagePoints.exact
  }
  if (predWinner === actualWinner) {
    return stagePoints.correctWinner
  }
  return 0
}
