import { formatMD, getETDateKey } from '@/lib/chart'
import type { JackpotEvent } from '@/lib/jackpot'

export type ScoreHistoryUser = {
  id: string
  name: string
  predictions: Array<{ matchId: string; points: number }>
}

export type ScoreHistoryMatch = {
  id: string
  matchNum: string | null
  kickoffTime: Date
}

export function jackpotPayoutsByMatchNum(
  events: JackpotEvent[]
): Map<string, { userId: string; amount: number }> {
  const map = new Map<string, { userId: string; amount: number }>()
  for (const event of events) {
    if (event.type === 'payout') {
      map.set(event.matchNum, { userId: event.userId, amount: event.amount })
    }
  }
  return map
}

/** Cumulative score history (match points + jackpot payouts on result day). */
export function buildScoreHistoryChartData(input: {
  users: ScoreHistoryUser[]
  finishedMatches: ScoreHistoryMatch[]
  jackpotPayoutsByMatchNum: Map<string, { userId: string; amount: number }>
}): Array<Record<string, string | number>> {
  const { users, finishedMatches, jackpotPayoutsByMatchNum } = input

  const chartData: Array<Record<string, string | number>> = [
    { name: 'Start', ...Object.fromEntries(users.map((u) => [u.name, 0])) },
  ]

  const matchesByDay = new Map<string, ScoreHistoryMatch[]>()
  for (const match of finishedMatches) {
    const dayKey = getETDateKey(match.kickoffTime)
    const list = matchesByDay.get(dayKey) ?? []
    list.push(match)
    matchesByDay.set(dayKey, list)
  }

  const userNameById = new Map(users.map((u) => [u.id, u.name]))
  const currentScores: Record<string, number> = Object.fromEntries(users.map((u) => [u.name, 0]))

  for (const dayKey of [...matchesByDay.keys()].sort()) {
    const dayMatches = matchesByDay.get(dayKey)!
    for (const match of dayMatches) {
      for (const user of users) {
        const pred = user.predictions.find((p) => p.matchId === match.id)
        if (pred && pred.points > 0) {
          currentScores[user.name] += pred.points
        }
      }

      const matchNum = match.matchNum?.trim()
      if (matchNum) {
        const payout = jackpotPayoutsByMatchNum.get(matchNum)
        if (payout) {
          const name = userNameById.get(payout.userId)
          if (name) currentScores[name] += payout.amount
        }
      }
    }

    chartData.push({
      name: formatMD(dayMatches[0].kickoffTime),
      ...currentScores,
    })
  }

  return chartData
}
