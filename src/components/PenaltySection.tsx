'use client'

import TeamFlag from '@/components/TeamFlag'
import { getPkWinnerSide, parseScoreValue } from '@/lib/penalties'

type PenaltySectionProps = {
  homeTeam: string
  awayTeam: string
  pkHome: string
  pkAway: string
  locked: boolean
  required?: boolean
  onPkHomeChange?: (val: string) => void
  onPkAwayChange?: (val: string) => void
}

export default function PenaltySection({
  homeTeam,
  awayTeam,
  pkHome,
  pkAway,
  locked,
  required = false,
  onPkHomeChange,
  onPkAwayChange,
}: PenaltySectionProps) {
  const pkHomeNum = parseScoreValue(pkHome)
  const pkAwayNum = parseScoreValue(pkAway)
  const pkTied = pkHomeNum !== null && pkAwayNum !== null && pkHomeNum === pkAwayNum
  const pkWinner = pkHomeNum !== null && pkAwayNum !== null ? getPkWinnerSide(pkHomeNum, pkAwayNum) : null
  const advancingTeam =
    pkWinner === 'HOME' ? homeTeam : pkWinner === 'AWAY' ? awayTeam : null

  return (
    <div className="penalty-section">
      <p className="penalty-section-label">
        Penalties{required ? '' : ' (optional)'}
      </p>
      <p className="penalty-section-hint">
        {required
          ? 'Regulation tied — enter the shootout score.'
          : 'If this goes to PK, who wins and the score?'}
      </p>
      <div className="predict-score-row">
        <div className="predict-side predict-side-home">
          <span className="predict-team predict-team-home">
            <TeamFlag team={homeTeam} />
            <span className="predict-team-name">{homeTeam}</span>
          </span>
          {locked ? (
            <span className="predict-score-fixed">{pkHome !== '' ? pkHome : '-'}</span>
          ) : (
            <input
              type="number"
              inputMode="numeric"
              className="input score-input"
              value={pkHome}
              onChange={(e) => onPkHomeChange?.(e.target.value)}
              min="0"
              placeholder="-"
              aria-label={`${homeTeam} penalty score`}
            />
          )}
        </div>
        <span className="predict-dash" aria-hidden="true">-</span>
        <div className="predict-side predict-side-away">
          {locked ? (
            <span className="predict-score-fixed">{pkAway !== '' ? pkAway : '-'}</span>
          ) : (
            <input
              type="number"
              inputMode="numeric"
              className="input score-input"
              value={pkAway}
              onChange={(e) => onPkAwayChange?.(e.target.value)}
              min="0"
              placeholder="-"
              aria-label={`${awayTeam} penalty score`}
            />
          )}
          <span className="predict-team predict-team-away">
            <span className="predict-team-name">{awayTeam}</span>
            <TeamFlag team={awayTeam} />
          </span>
        </div>
      </div>
      {!locked && pkTied && (
        <p className="penalty-section-error">PK cannot be tied.</p>
      )}
      {!locked && advancingTeam && !pkTied && (
        <p className="penalty-section-advance">{advancingTeam} advances on penalties</p>
      )}
      {!locked && !required && (
        <p className="penalty-section-warn">No PK pick = 0 pts if decided on penalties</p>
      )}
    </div>
  )
}
