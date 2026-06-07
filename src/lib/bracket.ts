import { isGroupPlaceholder } from './groups'
import { resolvePlaceholder, StandingRow } from './groupStandings'
import { getAdvancingTeam, getLosingTeam, isKnockoutStage } from './penalties'

export type BracketSlotUpdate = {
  matchId: string
  slot: 'HOME' | 'AWAY'
  team: string
}

export type MatchWithBracket = {
  id: string
  stage: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  pkHomeScore?: number | null
  pkAwayScore?: number | null
  nextMatchId?: string | null
  nextMatchSlot?: string | null
  loserNextMatchId?: string | null
  loserNextMatchSlot?: string | null
}

export type MatchTeams = {
  id: string
  homeTeam: string
  awayTeam: string
}

export function getKnockoutOutcome(match: MatchWithBracket): {
  winner: string | null
  loser: string | null
} {
  if (match.homeScore === match.awayScore) {
    if (!isKnockoutStage(match.stage)) {
      return { winner: null, loser: null }
    }
    if (match.pkHomeScore == null || match.pkAwayScore == null) {
      return { winner: null, loser: null }
    }
  }

  try {
    const winner = getAdvancingTeam(
      match.homeTeam,
      match.awayTeam,
      match.homeScore,
      match.awayScore,
      match.pkHomeScore,
      match.pkAwayScore
    )
    const loser = getLosingTeam(
      match.homeTeam,
      match.awayTeam,
      match.homeScore,
      match.awayScore,
      match.pkHomeScore,
      match.pkAwayScore
    )
    return { winner, loser }
  } catch {
    return { winner: null, loser: null }
  }
}

export function getKnockoutBracketUpdates(match: MatchWithBracket): BracketSlotUpdate[] {
  const { winner, loser } = getKnockoutOutcome(match)
  const updates: BracketSlotUpdate[] = []

  if (winner && match.nextMatchId && match.nextMatchSlot) {
    updates.push({
      matchId: match.nextMatchId,
      slot: match.nextMatchSlot as 'HOME' | 'AWAY',
      team: winner,
    })
  }

  if (loser && match.loserNextMatchId && match.loserNextMatchSlot) {
    updates.push({
      matchId: match.loserNextMatchId,
      slot: match.loserNextMatchSlot as 'HOME' | 'AWAY',
      team: loser,
    })
  }

  return updates
}

export function getR32PlaceholderUpdates(
  r32Matches: MatchTeams[],
  standingsByGroup: Map<string, StandingRow[] | null>
): BracketSlotUpdate[] {
  const updates: BracketSlotUpdate[] = []

  for (const match of r32Matches) {
    if (isGroupPlaceholder(match.homeTeam)) {
      const team = resolvePlaceholder(match.homeTeam, standingsByGroup)
      if (team) updates.push({ matchId: match.id, slot: 'HOME', team })
    }
    if (isGroupPlaceholder(match.awayTeam)) {
      const team = resolvePlaceholder(match.awayTeam, standingsByGroup)
      if (team) updates.push({ matchId: match.id, slot: 'AWAY', team })
    }
  }

  return updates
}

export function applyBracketUpdates<T extends MatchTeams>(
  matches: T[],
  updates: BracketSlotUpdate[]
): T[] {
  const byId = new Map(matches.map((m) => [m.id, { ...m }]))

  for (const update of updates) {
    const match = byId.get(update.matchId)
    if (!match) continue
    if (update.slot === 'HOME') match.homeTeam = update.team
    else match.awayTeam = update.team
  }

  return [...byId.values()]
}
