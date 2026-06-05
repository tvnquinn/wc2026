'use client'

import { useState } from 'react'
import { setMatchResult } from '@/app/actions'
import { Match } from '@prisma/client'
import PenaltySection from '@/components/PenaltySection'
import { isKnockoutStage, isRegulationDraw } from '@/lib/penalties'

export default function AdminMatchRow({ match }: { match: Match }) {
  const [homeScore, setHomeScore] = useState(match.homeScore?.toString() ?? '')
  const [awayScore, setAwayScore] = useState(match.awayScore?.toString() ?? '')
  const [pkHome, setPkHome] = useState(match.pkHomeScore?.toString() ?? '')
  const [pkAway, setPkAway] = useState(match.pkAwayScore?.toString() ?? '')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const showPenalties = isKnockoutStage(match.stage) && isRegulationDraw(homeScore, awayScore)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)
    try {
      await setMatchResult(
        match.id,
        homeScore,
        awayScore,
        showPenalties ? pkHome : undefined,
        showPenalties ? pkAway : undefined
      )
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card match-card" style={{ border: match.isFinished ? '1px solid var(--primary)' : '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
        <span style={{ color: 'var(--text)' }}>{match.stage}</span>
        <span suppressHydrationWarning style={{ fontSize: '0.9rem', color: match.isFinished ? 'var(--primary)' : 'var(--text-muted)' }}>
          {match.isFinished ? '✓ Finished' : new Date(match.kickoffTime).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) + ', ' + new Date(match.kickoffTime).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: 'America/New_York' }) + ' ET'}
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="match-row" style={{ border: 'none', padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <span style={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>{match.homeTeam}</span>
            <input
              type="number"
              className="input score-input"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              required
              min="0"
            />
            <span className="predict-dash">-</span>
            <input
              type="number"
              className="input score-input"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              required
              min="0"
            />
            <span style={{ flex: 1, textAlign: 'left', fontWeight: 600 }}>{match.awayTeam}</span>
          </div>

          <div style={{ minWidth: '100px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn danger" disabled={loading}>
              {loading ? '...' : success ? '✓ Updated' : 'Set Result'}
            </button>
          </div>
        </div>

        {showPenalties && (
          <PenaltySection
            homeTeam={match.homeTeam}
            awayTeam={match.awayTeam}
            pkHome={pkHome}
            pkAway={pkAway}
            locked={false}
            required
            onPkHomeChange={setPkHome}
            onPkAwayChange={setPkAway}
          />
        )}
      </form>
    </div>
  )
}
