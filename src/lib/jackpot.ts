import { getPkWinnerSide, matchWentToPenalties } from '@/lib/penalties'

export const JACKPOT_START_MATCH_NUM = '25'

export const JACKPOT_CONTRIBUTION: Record<string, number> = {
  GROUP: 2,
  R32: 4,
  R16: 6,
  QF: 8,
  SF: 10,
  THIRD: 10,
  FINAL: 12,
}

export type JackpotActual = {
  homeScore: number
  awayScore: number
  pkHomeScore: number | null
  pkAwayScore: number | null
  isFinished: boolean
}

export type JackpotPrediction = {
  userId: string
  homeScore: number
  awayScore: number
  pkHomeScore: number | null
  pkAwayScore: number | null
}

export type JackpotMatchInput = {
  matchNum: string | null
  stage: string
  kickoffTime: Date
  actual: JackpotActual
  predictions: JackpotPrediction[]
}

export type JackpotEvent =
  | { type: 'rollover'; matchNum: string; potAfter: number; winnerCount: number }
  | { type: 'payout'; matchNum: string; userId: string; amount: number }

export type JackpotReplayResult = {
  pot: number
  userWinnings: Record<string, number>
  events: JackpotEvent[]
}

export function isJackpotEligibleMatch(matchNum: string | null | undefined): boolean {
  if (!matchNum?.trim()) return false
  const n = Number(matchNum.trim())
  if (Number.isNaN(n)) return false
  return n >= Number(JACKPOT_START_MATCH_NUM)
}

export function jackpotContribution(stage: string): number {
  return JACKPOT_CONTRIBUTION[stage] ?? 0
}

export function isJackpotWin(
  stage: string,
  actual: JackpotActual,
  pred: Pick<JackpotPrediction, 'homeScore' | 'awayScore' | 'pkHomeScore' | 'pkAwayScore'>
): boolean {
  if (!actual.isFinished) return false
  if (pred.homeScore !== actual.homeScore || pred.awayScore !== actual.awayScore) return false

  const wentToPk = matchWentToPenalties(
    stage,
    actual.homeScore,
    actual.awayScore,
    actual.pkHomeScore,
    actual.pkAwayScore
  )

  if (!wentToPk) return true

  if (pred.pkHomeScore == null || pred.pkAwayScore == null) return false

  const predPkWinner = getPkWinnerSide(pred.pkHomeScore, pred.pkAwayScore)
  const actualPkWinner = getPkWinnerSide(actual.pkHomeScore!, actual.pkAwayScore!)
  if (!predPkWinner || !actualPkWinner) return false

  return predPkWinner === actualPkWinner
}

export function jackpotWinnersFromPredictions(
  stage: string,
  actual: JackpotActual,
  predictions: JackpotPrediction[]
): string[] {
  return predictions
    .filter((pred) => isJackpotWin(stage, actual, pred))
    .map((pred) => pred.userId)
}

export function applyJackpotForMatch(input: {
  pot: number
  contribution: number
  winnerUserIds: string[]
}): { pot: number; payout: number; winnerId: string | null } {
  const potAfterIncrement = input.pot + input.contribution

  if (input.winnerUserIds.length === 1) {
    return {
      pot: 0,
      payout: potAfterIncrement,
      winnerId: input.winnerUserIds[0],
    }
  }

  return {
    pot: potAfterIncrement,
    payout: 0,
    winnerId: null,
  }
}

export function replayJackpot(
  matches: JackpotMatchInput[],
  options?: { fromMatchNum?: string }
): JackpotReplayResult {
  const fromNum = options?.fromMatchNum != null ? Number(options.fromMatchNum) : Number(JACKPOT_START_MATCH_NUM)

  const sorted = [...matches].sort((a, b) => a.kickoffTime.getTime() - b.kickoffTime.getTime())

  let pot = 0
  const userWinnings: Record<string, number> = {}
  const events: JackpotEvent[] = []

  for (const match of sorted) {
    if (!match.matchNum?.trim()) continue
    const matchNum = match.matchNum.trim()
    const n = Number(matchNum)
    if (Number.isNaN(n) || n < Number(JACKPOT_START_MATCH_NUM)) continue
    if (n < fromNum) continue
    if (!match.actual.isFinished) continue
    if (match.actual.homeScore == null || match.actual.awayScore == null) continue

    const contribution = jackpotContribution(match.stage)
    const winnerUserIds = jackpotWinnersFromPredictions(match.stage, match.actual, match.predictions)
    const outcome = applyJackpotForMatch({ pot, contribution, winnerUserIds })

    if (outcome.winnerId && outcome.payout > 0) {
      userWinnings[outcome.winnerId] = (userWinnings[outcome.winnerId] ?? 0) + outcome.payout
      events.push({
        type: 'payout',
        matchNum,
        userId: outcome.winnerId,
        amount: outcome.payout,
      })
    } else {
      events.push({
        type: 'rollover',
        matchNum,
        potAfter: outcome.pot,
        winnerCount: winnerUserIds.length,
      })
    }

    pot = outcome.pot
  }

  return { pot, userWinnings, events }
}
