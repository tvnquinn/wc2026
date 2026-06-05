export const KNOCKOUT_STAGES = ['R32', 'R16', 'QF', 'SF', 'THIRD', 'FINAL'] as const

export const PENALTY_BONUS: Record<string, number> = {
  R32: 4,
  R16: 6,
  QF: 8,
  SF: 10,
  THIRD: 10,
  FINAL: 14,
}

export function isKnockoutStage(stage: string): boolean {
  return (KNOCKOUT_STAGES as readonly string[]).includes(stage)
}

export function parseScoreValue(val: string): number | null {
  if (val === '' || val === undefined) return null
  const n = parseInt(val, 10)
  return isNaN(n) ? null : n
}

export function isRegulationDraw(home: string, away: string): boolean {
  const h = parseScoreValue(home)
  const a = parseScoreValue(away)
  return h !== null && a !== null && h === a
}

export function getPkWinnerSide(pkHome: number, pkAway: number): 'HOME' | 'AWAY' | null {
  if (pkHome === pkAway) return null
  return pkHome > pkAway ? 'HOME' : 'AWAY'
}

export function getAdvancingTeam(
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  pkHome?: number | null,
  pkAway?: number | null
): string {
  if (homeScore !== awayScore) {
    return homeScore > awayScore ? homeTeam : awayTeam
  }
  if (pkHome != null && pkAway != null && pkHome !== pkAway) {
    return pkHome > pkAway ? homeTeam : awayTeam
  }
  throw new Error('Knockout draw requires penalty shootout scores')
}

export function getLosingTeam(
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  pkHome?: number | null,
  pkAway?: number | null
): string {
  const winner = getAdvancingTeam(homeTeam, awayTeam, homeScore, awayScore, pkHome, pkAway)
  return winner === homeTeam ? awayTeam : homeTeam
}

export function formatScoreDisplay(
  home: number,
  away: number,
  pkHome?: number | null,
  pkAway?: number | null
): string {
  const base = `${home}-${away}`
  if (pkHome != null && pkAway != null) {
    return `${base} (${pkHome}-${pkAway})`
  }
  return base
}

export function matchWentToPenalties(
  stage: string,
  homeScore: number,
  awayScore: number,
  pkHome?: number | null,
  pkAway?: number | null
): boolean {
  return (
    isKnockoutStage(stage) &&
    homeScore === awayScore &&
    pkHome != null &&
    pkAway != null &&
    pkHome !== pkAway
  )
}
