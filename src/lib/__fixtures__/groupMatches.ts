type GroupMatch = {
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  isFinished: boolean
  stage: string
}

/** Group A round-robin: Mexico 1st (9 pts), South Korea 2nd, Czechia 3rd, South Africa 4th */
export function groupAMatches(): GroupMatch[] {
  return [
    { stage: 'GROUP', homeTeam: 'Mexico', awayTeam: 'South Africa', homeScore: 2, awayScore: 0, isFinished: true },
    { stage: 'GROUP', homeTeam: 'South Korea', awayTeam: 'Czechia', homeScore: 1, awayScore: 1, isFinished: true },
    { stage: 'GROUP', homeTeam: 'Mexico', awayTeam: 'South Korea', homeScore: 1, awayScore: 0, isFinished: true },
    { stage: 'GROUP', homeTeam: 'South Africa', awayTeam: 'Czechia', homeScore: 0, awayScore: 1, isFinished: true },
    { stage: 'GROUP', homeTeam: 'Mexico', awayTeam: 'Czechia', homeScore: 3, awayScore: 0, isFinished: true },
    { stage: 'GROUP', homeTeam: 'South Africa', awayTeam: 'South Korea', homeScore: 1, awayScore: 2, isFinished: true },
  ]
}

/** Group B round-robin: Canada 1st, Switzerland 2nd, Qatar 3rd, Bosnia 4th */
export function groupBMatches(): GroupMatch[] {
  return [
    { stage: 'GROUP', homeTeam: 'Canada', awayTeam: 'Bosnia and Herzegovina', homeScore: 2, awayScore: 0, isFinished: true },
    { stage: 'GROUP', homeTeam: 'Qatar', awayTeam: 'Switzerland', homeScore: 0, awayScore: 2, isFinished: true },
    { stage: 'GROUP', homeTeam: 'Canada', awayTeam: 'Qatar', homeScore: 3, awayScore: 0, isFinished: true },
    { stage: 'GROUP', homeTeam: 'Bosnia and Herzegovina', awayTeam: 'Switzerland', homeScore: 1, awayScore: 1, isFinished: true },
    { stage: 'GROUP', homeTeam: 'Canada', awayTeam: 'Switzerland', homeScore: 1, awayScore: 1, isFinished: true },
    { stage: 'GROUP', homeTeam: 'Bosnia and Herzegovina', awayTeam: 'Qatar', homeScore: 0, awayScore: 2, isFinished: true },
  ]
}

export function incompleteGroupAMatches(): GroupMatch[] {
  return groupAMatches().slice(0, 5).map((m) => ({ ...m }))
}
