'use client'

import { LeagueResultOverride, Match } from '@prisma/client'
import PenaltySection from '@/components/PenaltySection'
import { isKnockoutStage, isRegulationDraw } from '@/lib/penalties'

export type AdminScoreState = {
  homeScore: string
  awayScore: string
  pkHome: string
  pkAway: string
}

export default function AdminMatchRow({
  isGlobalScorer,
  match,
  override,
  scores,
  onScoresChange,
  onSave,
  isSaving,
  saveSuccess,
  isDirty,
  canSave,
}: {
  isGlobalScorer: boolean
  match: Match
  override: LeagueResultOverride | null
  scores: AdminScoreState
  onScoresChange: (next: AdminScoreState) => void
  onSave: () => void
  isSaving: boolean
  saveSuccess: boolean
  isDirty: boolean
  canSave: boolean
}) {
  const leagueFinished = isGlobalScorer ? match.isFinished : (override?.isFinished ?? false)
  const showPenalties = isKnockoutStage(match.stage) && isRegulationDraw(scores.homeScore, scores.awayScore)
  const showOfficialHint = !isGlobalScorer && match.isFinished && !override

  return (
    <div
      className="card match-card"
      style={{ border: leagueFinished ? '1px solid var(--primary)' : '1px solid var(--border)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
        <span style={{ color: 'var(--text)' }}>{match.stage}</span>
        <span
          suppressHydrationWarning
          style={{ fontSize: '0.9rem', color: leagueFinished ? 'var(--primary)' : 'var(--text-muted)' }}
        >
          {leagueFinished
            ? '✓ Finished'
            : new Date(match.kickoffTime).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) +
              ', ' +
              new Date(match.kickoffTime).toLocaleTimeString('en-US', {
                hour: 'numeric',
                hour12: true,
                timeZone: 'America/New_York',
              }) +
              ' ET'}
        </span>
      </div>

      {showOfficialHint && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          Official: {match.homeScore}-{match.awayScore}
          {match.pkHomeScore != null && match.pkAwayScore != null
            ? ` (${match.pkHomeScore}-${match.pkAwayScore} PK)`
            : ''}{' '}
          — enter below to use a different result for this league
        </p>
      )}

      <div className="match-row" style={{ border: 'none', padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          <span style={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>{match.homeTeam}</span>
          <input
            type="number"
            className="input score-input"
            value={scores.homeScore}
            onChange={(e) => onScoresChange({ ...scores, homeScore: e.target.value })}
            min="0"
            placeholder="-"
            aria-label={`${match.homeTeam} score`}
          />
          <span className="predict-dash">-</span>
          <input
            type="number"
            className="input score-input"
            value={scores.awayScore}
            onChange={(e) => onScoresChange({ ...scores, awayScore: e.target.value })}
            min="0"
            placeholder="-"
            aria-label={`${match.awayTeam} score`}
          />
          <span style={{ flex: 1, textAlign: 'left', fontWeight: 600 }}>{match.awayTeam}</span>
        </div>
      </div>

      {showPenalties && (
        <PenaltySection
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          pkHome={scores.pkHome}
          pkAway={scores.pkAway}
          locked={false}
          required
          onPkHomeChange={(val) => onScoresChange({ ...scores, pkHome: val })}
          onPkAwayChange={(val) => onScoresChange({ ...scores, pkAway: val })}
        />
      )}

      <div className="admin-match-save-row">
        <button
          type="button"
          className="btn admin-match-save-btn"
          onClick={onSave}
          disabled={isSaving || !canSave}
          data-dirty={isDirty ? 'true' : 'false'}
          data-success={saveSuccess ? 'true' : 'false'}
        >
          {isSaving ? 'Saving…' : saveSuccess ? '✓ Saved' : isDirty ? 'Save result' : 'Save'}
        </button>
      </div>
    </div>
  )
}
