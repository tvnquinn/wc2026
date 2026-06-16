'use client'

import { useMemo, useState } from 'react'
import { formatMatchNumLabel } from '@/lib/formatMatchNum'
import { formatScoreDisplay } from '@/lib/penalties'
import { userColorMap } from '@/lib/userColors'

type User = { id: string; name: string }
type Match = {
  id: string
  matchNum: string | null
  stage: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  pkHomeScore: number | null
  pkAwayScore: number | null
  isFinished: boolean
}
type Prediction = {
  userId: string
  matchId: string
  homeScore: number
  awayScore: number
  pkHomeScore: number | null
  pkAwayScore: number | null
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

function matchCardStageLabel(match: Match): string {
  const stage = formatStageLabel(match.stage)
  const num = formatMatchNumLabel(match.matchNum)
  return num ? `${stage} - ${num}` : stage
}

function resultCell(match: Match): string {
  if (match.isFinished && match.homeScore != null && match.awayScore != null) {
    return formatScoreDisplay(match.homeScore, match.awayScore, match.pkHomeScore, match.pkAwayScore)
  }
  return '-'
}

export default function PicksGrid({
  matches,
  users,
  predictions,
}: {
  matches: Match[]
  users: User[]
  predictions: Prediction[]
}) {
  const [showFinished, setShowFinished] = useState(false)

  const colors = useMemo(() => userColorMap(users), [users])

  const predMap = useMemo(() => {
    const map = new Map<string, Prediction>()
    for (const p of predictions) {
      map.set(`${p.userId}:${p.matchId}`, p)
    }
    return map
  }, [predictions])

  const finishedCount = matches.filter((m) => m.isFinished).length
  const visibleMatches = showFinished ? matches : matches.filter((m) => !m.isFinished)

  return (
    <div className="picks-view">
      {finishedCount > 0 && (
        <button
          type="button"
          className="btn picks-finished-toggle"
          onClick={() => setShowFinished((open) => !open)}
        >
          {showFinished
            ? `Hide ${finishedCount} completed match${finishedCount === 1 ? '' : 'es'}`
            : `Show ${finishedCount} completed match${finishedCount === 1 ? '' : 'es'}`}
        </button>
      )}

      <div className="picks-mobile-cards">
        {visibleMatches.map((match) => (
          <div key={match.id} className="card picks-match-card">
            <div className="picks-match-card-header">
              <span className="picks-match-card-stage">{matchCardStageLabel(match)}</span>
              <span className="picks-match-card-teams">
                {match.homeTeam} vs {match.awayTeam}
              </span>
              <span className="picks-match-card-result">Result: {resultCell(match)}</span>
            </div>
            <div className="picks-match-card-picks">
              {users.map((user) => {
                const pred = predMap.get(`${user.id}:${match.id}`)
                return (
                  <div key={user.id} className="picks-match-card-row">
                    <span className="picks-match-card-user" style={{ color: colors.get(user.id) }}>
                      {user.name}
                    </span>
                    <span className="picks-match-card-score">
                      {pred
                        ? formatScoreDisplay(
                            pred.homeScore,
                            pred.awayScore,
                            pred.pkHomeScore,
                            pred.pkAwayScore
                          )
                        : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {visibleMatches.length === 0 && (
          <p className="picks-empty">No upcoming matches — expand completed matches to review past picks.</p>
        )}
      </div>

      <div className="picks-grid-scroll">
        <table className="picks-grid">
          <thead>
            <tr>
              <th className="picks-grid-stage-col picks-grid-sticky-col">Stage</th>
              <th className="picks-grid-num-col picks-grid-sticky-col picks-grid-sticky-col-2">#</th>
              <th className="picks-grid-match-col picks-grid-sticky-col picks-grid-sticky-col-3">Match</th>
              <th className="picks-grid-result-col">Result</th>
              {users.map((user) => (
                <th
                  key={user.id}
                  className="picks-grid-user-col picks-grid-sticky-header"
                  style={{ color: colors.get(user.id) }}
                >
                  {user.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleMatches.map((match) => (
              <tr key={match.id} className={match.isFinished ? 'picks-row-finished' : undefined}>
                <td className="picks-grid-stage-col picks-grid-sticky-col">{formatStageLabel(match.stage)}</td>
                <td className="picks-grid-num-col picks-grid-sticky-col picks-grid-sticky-col-2">
                  {formatMatchNumLabel(match.matchNum)}
                </td>
                <td className="picks-grid-match-col picks-grid-sticky-col picks-grid-sticky-col-3">
                  {match.homeTeam} - {match.awayTeam}
                </td>
                <td className="picks-grid-result-col">{resultCell(match)}</td>
                {users.map((user) => {
                  const pred = predMap.get(`${user.id}:${match.id}`)
                  return (
                    <td key={user.id} className="picks-grid-user-col">
                      {pred
                        ? formatScoreDisplay(
                            pred.homeScore,
                            pred.awayScore,
                            pred.pkHomeScore,
                            pred.pkAwayScore
                          )
                        : ''}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {visibleMatches.length === 0 && (
          <p className="picks-empty picks-empty-desktop">No upcoming matches in the table view.</p>
        )}
      </div>
    </div>
  )
}
