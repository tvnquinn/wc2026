import { formatScoreDisplay } from '@/lib/penalties'

type User = { id: string; name: string }
type Match = {
  id: string
  stage: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  pkHomeScore: number | null
  pkAwayScore: number | null
  isFinished: boolean
}

function formatStageLabel(stage: string): string {
  switch (stage) {
    case 'GROUP':
      return 'Group'
    case 'THIRD':
      return '3rd'
    case 'FINAL':
      return 'Final'
    default:
      return stage
  }
}
type Prediction = {
  userId: string
  matchId: string
  homeScore: number
  awayScore: number
  pkHomeScore: number | null
  pkAwayScore: number | null
}

const HEADER_COLORS = [
  '#3b82f6',
  '#E61D25',
  '#fbbf24',
  '#3CAC3B',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#f97316',
]

export default function PicksGrid({
  matches,
  users,
  predictions,
}: {
  matches: Match[]
  users: User[]
  predictions: Prediction[]
}) {
  const predMap = new Map<string, Prediction>()
  for (const p of predictions) {
    predMap.set(`${p.userId}:${p.matchId}`, p)
  }

  return (
    <div className="picks-grid-wrap">
      <table className="picks-grid">
        <thead>
          <tr>
            <th className="picks-grid-stage-col">Stage</th>
            <th className="picks-grid-match-col">Match</th>
            <th className="picks-grid-result-col">Result</th>
            {users.map((user, i) => (
              <th
                key={user.id}
                className="picks-grid-user-col"
                style={{ color: HEADER_COLORS[i % HEADER_COLORS.length] }}
              >
                {user.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => (
            <tr key={match.id}>
              <td className="picks-grid-stage-col">{formatStageLabel(match.stage)}</td>
              <td className="picks-grid-match-col">
                {match.homeTeam} - {match.awayTeam}
              </td>
              <td className="picks-grid-result-col">
                {match.isFinished && match.homeScore != null && match.awayScore != null
                  ? formatScoreDisplay(match.homeScore, match.awayScore, match.pkHomeScore, match.pkAwayScore)
                  : '-'}
              </td>
              {users.map((user) => {
                const pred = predMap.get(`${user.id}:${match.id}`)
                return (
                  <td key={user.id} className="picks-grid-user-col">
                    {pred
                      ? formatScoreDisplay(pred.homeScore, pred.awayScore, pred.pkHomeScore, pred.pkAwayScore)
                      : ''}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
