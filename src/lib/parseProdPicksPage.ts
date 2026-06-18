/**
 * Parse users, match results, and predictions from the production picks page RSC payload.
 */

export type ProdMatch = {
  homeTeam: string
  awayTeam: string
  stage: string
  homeScore: number | null
  awayScore: number | null
  pkHomeScore: number | null
  pkAwayScore: number | null
  isFinished: boolean
}

export type ProdPrediction = {
  userName: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  pkHomeScore: number | null
  pkAwayScore: number | null
}

function normalizeHtml(html: string): string {
  return html
    .replace(/\\"/g, '"')
    .replace(/"\$D/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\\u003e/g, '>')
}

export function parseProdPicksPage(html: string): {
  users: string[]
  matches: ProdMatch[]
  predictions: ProdPrediction[]
} {
  const text = normalizeHtml(html)

  const users: string[] = []
  const userIdToName = new Map<string, string>()
  for (const m of text.matchAll(
    /\{"id":"([^"]+)","leagueId":"[^"]+","name":"([^"]+)","passwordHash"/g
  )) {
    userIdToName.set(m[1], m[2])
    users.push(m[2])
  }

  const matchById = new Map<
    string,
    ProdMatch & { id: string }
  >()
  for (const m of text.matchAll(
    /\{"id":"([^"]+)","matchNum":"[^"]*","homeTeam":"([^"]+)","awayTeam":"([^"]+)","kickoffTime":"[^"]*","stage":"([^"]+)","homeScore":(null|\d+),"awayScore":(null|\d+),"pkHomeScore":(null|\d+),"pkAwayScore":(null|\d+)[^}]*"isFinished":(true|false)/g
  )) {
    const [, id, homeTeam, awayTeam, stage, hs, as_, pkH, pkA, fin] = m
    matchById.set(id, {
      id,
      homeTeam,
      awayTeam,
      stage,
      homeScore: hs === 'null' ? null : Number(hs),
      awayScore: as_ === 'null' ? null : Number(as_),
      pkHomeScore: pkH === 'null' ? null : Number(pkH),
      pkAwayScore: pkA === 'null' ? null : Number(pkA),
      isFinished: fin === 'true',
    })
  }

  const predictions: ProdPrediction[] = []
  for (const m of text.matchAll(
    /\{"id":"[^"]+","userId":"([^"]+)","matchId":"([^"]+)","homeScore":(\d+),"awayScore":(\d+),"pkHomeScore":(null|\d+),"pkAwayScore":(null|\d+),"points":\d+\}/g
  )) {
    const [, userId, matchId, hs, as_, pkH, pkA] = m
    const match = matchById.get(matchId)
    const userName = userIdToName.get(userId)
    if (!match || !userName) continue
    predictions.push({
      userName,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: Number(hs),
      awayScore: Number(as_),
      pkHomeScore: pkH === 'null' ? null : Number(pkH),
      pkAwayScore: pkA === 'null' ? null : Number(pkA),
    })
  }

  return {
    users,
    matches: [...matchById.values()].map(({ id: _id, ...rest }) => rest),
    predictions,
  }
}
