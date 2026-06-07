import { GROUP_LETTERS, getGroupLetterForTeams } from './groups'

export type StandingRow = {
  team: string
  played: number
  points: number
  gf: number
  ga: number
  gd: number
}

type FinishedGroupMatch = {
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  isFinished: boolean
  stage: string
}

function compareStandings(a: StandingRow, b: StandingRow): number {
  if (b.points !== a.points) return b.points - a.points
  if (b.gd !== a.gd) return b.gd - a.gd
  if (b.gf !== a.gf) return b.gf - a.gf
  return a.team.localeCompare(b.team)
}

export function getGroupMatches(
  matches: FinishedGroupMatch[],
  groupLetter: string
): FinishedGroupMatch[] {
  return matches.filter(
    (m) =>
      m.stage === 'GROUP' &&
      getGroupLetterForTeams(m.homeTeam, m.awayTeam) === groupLetter
  )
}

export function isGroupComplete(groupMatches: FinishedGroupMatch[]): boolean {
  return groupMatches.length === 6 && groupMatches.every((m) => m.isFinished)
}

export function computeGroupStandings(
  groupMatches: FinishedGroupMatch[]
): StandingRow[] | null {
  if (!isGroupComplete(groupMatches)) return null

  const teamNames = new Set<string>()
  for (const m of groupMatches) {
    teamNames.add(m.homeTeam)
    teamNames.add(m.awayTeam)
  }
  if (teamNames.size !== 4) return null

  const rows = new Map<string, StandingRow>()
  for (const team of teamNames) {
    rows.set(team, { team, played: 0, points: 0, gf: 0, ga: 0, gd: 0 })
  }

  for (const m of groupMatches) {
    if (m.homeScore == null || m.awayScore == null) return null
    const home = rows.get(m.homeTeam)
    const away = rows.get(m.awayTeam)
    if (!home || !away) continue

    home.played++
    away.played++
    home.gf += m.homeScore
    home.ga += m.awayScore
    away.gf += m.awayScore
    away.ga += m.homeScore

    if (m.homeScore > m.awayScore) {
      home.points += 3
    } else if (m.homeScore < m.awayScore) {
      away.points += 3
    } else {
      home.points += 1
      away.points += 1
    }
  }

  for (const row of rows.values()) {
    row.gd = row.gf - row.ga
  }

  return [...rows.values()].sort(compareStandings)
}

export function resolvePlaceholder(
  code: string,
  standingsByGroup: Map<string, StandingRow[] | null>
): string | null {
  const posMatch = code.match(/^([12])([A-L])$/)
  if (posMatch) {
    const index = parseInt(posMatch[1], 10) - 1
    const group = posMatch[2]
    const standings = standingsByGroup.get(group)
    if (!standings || standings.length <= index) return null
    return standings[index].team
  }

  const thirdMatch = code.match(/^3([A-L]+)$/)
  if (thirdMatch) {
    const thirds: StandingRow[] = []
    for (const group of thirdMatch[1]) {
      const standings = standingsByGroup.get(group)
      if (!standings || standings.length < 3) return null
      thirds.push(standings[2])
    }
    return [...thirds].sort(compareStandings)[0].team
  }

  return null
}

export function buildAllGroupStandings(
  matches: FinishedGroupMatch[]
): Map<string, StandingRow[] | null> {
  const standingsByGroup = new Map<string, StandingRow[] | null>()
  for (const letter of GROUP_LETTERS) {
    const groupMatches = getGroupMatches(matches, letter)
    standingsByGroup.set(letter, computeGroupStandings(groupMatches))
  }
  return standingsByGroup
}
