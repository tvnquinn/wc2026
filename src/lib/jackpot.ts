import { getPkWinnerSide, matchWentToPenalties } from '@/lib/penalties'

export const JACKPOT_START_MATCH_NUM = '25'

export const JACKPOT_CONTRIBUTION: Record<string, number> = {
  GROUP: 2,
  R32: 4,
  R16: 8,
  QF: 16,
  SF: 32,
  THIRD: 32,
  FINAL: 64,
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
  | { type: 'contribution'; matchNum: string; amount: number; potAfter: number }
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

/** Settle the pot after one or more finished matches that kicked off together. */
export function applyJackpotBatchSettlement(input: {
  pot: number
  matches: Array<{
    matchNum: string
    winnerUserIds: string[]
  }>
}): {
  pot: number
  payouts: Array<{ matchNum: string; userId: string; amount: number }>
  rollovers: Array<{ matchNum: string; amount: number; winnerCount: number }>
} {
  const matches = input.matches
  if (matches.length === 0) {
    return { pot: input.pot, payouts: [], rollovers: [] }
  }

  const soloWinnerMatches = matches.filter((match) => match.winnerUserIds.length === 1)
  const n = soloWinnerMatches.length

  const payouts: Array<{ matchNum: string; userId: string; amount: number }> = []
  const rollovers: Array<{ matchNum: string; amount: number; winnerCount: number }> = []

  if (n === 0) {
    for (const match of matches) {
      rollovers.push({
        matchNum: match.matchNum,
        amount: 0,
        winnerCount: match.winnerUserIds.length,
      })
    }
    return { pot: input.pot, payouts, rollovers }
  }

  const baseSlice = Math.floor(input.pot / n)
  const remainder = input.pot % n
  let pot = remainder

  for (const match of matches) {
    const winnerCount = match.winnerUserIds.length
    if (winnerCount === 1) {
      payouts.push({
        matchNum: match.matchNum,
        userId: match.winnerUserIds[0],
        amount: baseSlice,
      })
    } else {
      rollovers.push({
        matchNum: match.matchNum,
        amount: 0,
        winnerCount,
      })
    }
  }

  return { pot, payouts, rollovers }
}

/** Settle the pot after a single finished match — no contribution increment. */
export function applyJackpotSettlement(input: {
  pot: number
  winnerUserIds: string[]
}): { pot: number; payout: number; winnerId: string | null } {
  const outcome = applyJackpotBatchSettlement({
    pot: input.pot,
    matches: [{ matchNum: '_', winnerUserIds: input.winnerUserIds }],
  })

  if (outcome.payouts.length === 1) {
    return {
      pot: outcome.pot,
      payout: outcome.payouts[0].amount,
      winnerId: outcome.payouts[0].userId,
    }
  }

  return {
    pot: outcome.pot,
    payout: 0,
    winnerId: null,
  }
}

/** Legacy helper: increment pot then settle (used in unit tests). */
export function applyJackpotForMatch(input: {
  pot: number
  contribution: number
  winnerUserIds: string[]
}): { pot: number; payout: number; winnerId: string | null } {
  const potAfterContribution = input.pot + input.contribution
  const settlement = applyJackpotSettlement({
    pot: potAfterContribution,
    winnerUserIds: input.winnerUserIds,
  })
  return settlement
}

export function replayJackpot(
  matches: JackpotMatchInput[],
  options?: { fromMatchNum?: string; now?: Date }
): JackpotReplayResult {
  const fromNum = options?.fromMatchNum != null ? Number(options.fromMatchNum) : Number(JACKPOT_START_MATCH_NUM)
  const now = options?.now ?? new Date()

  const sorted = [...matches].sort(
    (a, b) =>
      a.kickoffTime.getTime() - b.kickoffTime.getTime() ||
      Number(a.matchNum ?? 0) - Number(b.matchNum ?? 0)
  )

  const batches: JackpotMatchInput[][] = []
  for (const match of sorted) {
    if (!match.matchNum?.trim()) continue
    const matchNum = match.matchNum.trim()
    const n = Number(matchNum)
    if (Number.isNaN(n) || n < Number(JACKPOT_START_MATCH_NUM)) continue

    const lastBatch = batches[batches.length - 1]
    if (lastBatch && lastBatch[0].kickoffTime.getTime() === match.kickoffTime.getTime()) {
      lastBatch.push(match)
    } else {
      batches.push([match])
    }
  }

  let pot = 0
  const userWinnings: Record<string, number> = {}
  const events: JackpotEvent[] = []

  for (const batch of batches) {
    const activeMatches = batch.filter((match) => {
      const n = Number(match.matchNum!.trim())
      if (n < fromNum) return false
      return match.kickoffTime.getTime() <= now.getTime()
    })
    if (activeMatches.length === 0) continue

    for (const match of activeMatches) {
      const matchNum = match.matchNum!.trim()
      const contribution = jackpotContribution(match.stage)
      pot += contribution
      events.push({ type: 'contribution', matchNum, amount: contribution, potAfter: pot })
    }

    const finishedMatches = activeMatches.filter(
      (match) =>
        match.actual.isFinished &&
        match.actual.homeScore != null &&
        match.actual.awayScore != null
    )
    if (finishedMatches.length !== activeMatches.length) continue

    const outcome = applyJackpotBatchSettlement({
      pot,
      matches: finishedMatches.map((match) => ({
        matchNum: match.matchNum!.trim(),
        winnerUserIds: jackpotWinnersFromPredictions(match.stage, match.actual, match.predictions),
      })),
    })

    for (const payout of outcome.payouts) {
      userWinnings[payout.userId] = (userWinnings[payout.userId] ?? 0) + payout.amount
      events.push({
        type: 'payout',
        matchNum: payout.matchNum,
        userId: payout.userId,
        amount: payout.amount,
      })
    }

    for (const rollover of outcome.rollovers) {
      events.push({
        type: 'rollover',
        matchNum: rollover.matchNum,
        potAfter: outcome.pot,
        winnerCount: rollover.winnerCount,
      })
    }

    pot = outcome.pot
  }

  return { pot, userWinnings, events }
}
