import { isKnockoutStage, parseScoreValue } from '@/lib/penalties'

export type ScorePick = {
  homeScore: number
  awayScore: number
  pkHomeScore: number | null
  pkAwayScore: number | null
}

export type DraftPick = {
  homeScore: string
  awayScore: string
  pkHomeScore: string
  pkAwayScore: string
}

/** Parse in-progress or saved string inputs into a comparable pick. */
export function draftToScorePick(stage: string, draft: DraftPick): ScorePick | null {
  const homeScore = parseScoreValue(draft.homeScore)
  const awayScore = parseScoreValue(draft.awayScore)
  if (homeScore === null || awayScore === null) return null

  const isKoDraw = isKnockoutStage(stage) && homeScore === awayScore
  const pkHomeScore = isKoDraw ? parseScoreValue(draft.pkHomeScore) : null
  const pkAwayScore = isKoDraw ? parseScoreValue(draft.pkAwayScore) : null

  return { homeScore, awayScore, pkHomeScore, pkAwayScore }
}

export function scorePickFromStored(pred: {
  homeScore: number
  awayScore: number
  pkHomeScore: number | null
  pkAwayScore: number | null
}): ScorePick {
  return {
    homeScore: pred.homeScore,
    awayScore: pred.awayScore,
    pkHomeScore: pred.pkHomeScore,
    pkAwayScore: pred.pkAwayScore,
  }
}

/** True when two picks are the same guess (regulation; PK when both sides entered PK). */
export function predictionsMatch(stage: string, a: ScorePick, b: ScorePick): boolean {
  if (a.homeScore !== b.homeScore || a.awayScore !== b.awayScore) return false

  if (!isKnockoutStage(stage) || a.homeScore !== a.awayScore) return true

  const aHasPk = a.pkHomeScore !== null && a.pkAwayScore !== null
  const bHasPk = b.pkHomeScore !== null && b.pkAwayScore !== null
  if (aHasPk && bHasPk) {
    return a.pkHomeScore === b.pkHomeScore && a.pkAwayScore === b.pkAwayScore
  }

  return true
}

export function findOverlappingNames(
  stage: string,
  pick: ScorePick,
  currentUserId: string,
  others: Array<{ userId: string; name: string; pick: ScorePick }>
): string[] {
  return others
    .filter((o) => o.userId !== currentUserId && predictionsMatch(stage, pick, o.pick))
    .map((o) => o.name)
    .sort((a, b) => a.localeCompare(b))
}

export function formatOverlapMessage(names: string[]): string | null {
  if (names.length === 0) return null
  if (names.length === 1) return `Same guess as ${names[0]}`
  if (names.length === 2) return `Same guess as ${names[0]} and ${names[1]}`
  return `Same guess as ${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}
