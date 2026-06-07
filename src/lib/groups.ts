export const GROUP_TEAMS: Record<string, string[]> = {
  A: ['Mexico', 'South Africa', 'South Korea', 'Czechia'],
  B: ['Canada', 'Qatar', 'Switzerland', 'Bosnia and Herzegovina'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['United States', 'Paraguay', 'Australia', 'Türkiye'],
  E: ['Germany', 'Curacao', 'Ivory Coast', 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Tunisia', 'Sweden'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'Norway', 'Iraq'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'Uzbekistan', 'Colombia', 'DR Congo'],
  L: ['England', 'Croatia', 'Ghana', 'Panama'],
}

/** Playoff winner placeholders from an older schedule → confirmed team names. */
export const PLAYOFF_PLACEHOLDER_MAP: Record<string, string> = {
  'UEFA A': 'Bosnia and Herzegovina',
  'UEFA B': 'Sweden',
  'UEFA C': 'Türkiye',
  'UEFA D': 'Czechia',
  'FIFA 1': 'DR Congo',
  'FIFA 2': 'Iraq',
}

export const GROUP_LETTERS = Object.keys(GROUP_TEAMS)

export function resolvePlayoffPlaceholder(team: string): string {
  return PLAYOFF_PLACEHOLDER_MAP[team] ?? team
}

export function isGroupPlaceholder(code: string): boolean {
  return /^[12][A-L]$/.test(code) || /^3[A-L]+$/.test(code)
}

function squadSet(groupLetter: string): Set<string> {
  const squad = new Set(GROUP_TEAMS[groupLetter])
  for (const [placeholder, canonical] of Object.entries(PLAYOFF_PLACEHOLDER_MAP)) {
    if (squad.has(canonical)) {
      squad.add(placeholder)
    }
  }
  return squad
}

export function getGroupLetterForTeams(homeTeam: string, awayTeam: string): string | null {
  for (const letter of GROUP_LETTERS) {
    const squad = squadSet(letter)
    if (squad.has(homeTeam) && squad.has(awayTeam)) return letter
  }
  return null
}
