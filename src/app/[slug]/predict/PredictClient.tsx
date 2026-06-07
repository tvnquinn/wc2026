'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  submitAllPredictions,
  createUser,
  unlockUser,
  clearPredictSession,
} from '@/app/actions'
import { Match, Prediction } from '@prisma/client'
import TeamFlag from '@/components/TeamFlag'
import PenaltySection from '@/components/PenaltySection'
import { isKnockoutStage, isRegulationDraw, parseScoreValue } from '@/lib/penalties'

type UserOption = { id: string; name: string }

type MatchPrediction = {
  homeScore: string
  awayScore: string
  pkHomeScore: string
  pkAwayScore: string
}

type PredictState = { [matchId: string]: MatchPrediction }

const emptyPrediction = (): MatchPrediction => ({
  homeScore: '',
  awayScore: '',
  pkHomeScore: '',
  pkAwayScore: '',
})

const PIN_REGEX = /^\d{0,4}$/

function sanitizePin(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4)
}

export default function PredictClient({
  leagueSlug,
  users,
  matches,
  scoredMatchIds,
  allPredictions,
  initialSessionUserId,
}: {
  leagueSlug: string
  users: UserOption[]
  matches: Match[]
  scoredMatchIds: string[]
  allPredictions: Prediction[]
  initialSessionUserId: string | null
}) {
  const scoredSet = new Set(scoredMatchIds)
  const [selectedUserId, setSelectedUserId] = useState<string>(initialSessionUserId ?? '')
  const [sessionUserId, setSessionUserId] = useState<string | null>(initialSessionUserId)
  const [newUserName, setNewUserName] = useState<string>('')
  const [newUserPin, setNewUserPin] = useState<string>('')
  const [unlockPin, setUnlockPin] = useState<string>('')

  const [predictions, setPredictions] = useState<PredictState>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)

  const isUnlocked = !!selectedUserId && sessionUserId === selectedUserId

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!selectedUserId || !isUnlocked) {
      setPredictions({})
      return
    }
    const userPreds = allPredictions.filter(p => p.userId === selectedUserId)
    const state: PredictState = {}
    for (const p of userPreds) {
      state[p.matchId] = {
        homeScore: p.homeScore.toString(),
        awayScore: p.awayScore.toString(),
        pkHomeScore: p.pkHomeScore?.toString() ?? '',
        pkAwayScore: p.pkAwayScore?.toString() ?? '',
      }
    }
    setPredictions(state)
  }, [selectedUserId, isUnlocked, allPredictions])

  const handleSelectUser = async (userId: string) => {
    setSelectedUserId(userId)
    setUnlockPin('')
    setSessionUserId(null)
    setSuccess(false)
    if (userId) {
      await clearPredictSession()
    }
  }

  const handleUpdateScore = (matchId: string, side: 'homeScore' | 'awayScore', val: string) => {
    setPredictions(prev => {
      const current = prev[matchId] || emptyPrediction()
      const next = { ...current, [side]: val }
      if (!isRegulationDraw(
        side === 'homeScore' ? val : current.homeScore,
        side === 'awayScore' ? val : current.awayScore
      )) {
        next.pkHomeScore = ''
        next.pkAwayScore = ''
      }
      return { ...prev, [matchId]: next }
    })
  }

  const handleUpdatePk = (matchId: string, side: 'pkHomeScore' | 'pkAwayScore', val: string) => {
    setPredictions(prev => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] || emptyPrediction()),
        [side]: val
      }
    }))
  }

  const handleCreateUser = async () => {
    if (!newUserName.trim() || !PIN_REGEX.test(newUserPin) || newUserPin.length !== 4) return
    setLoading(true)
    try {
      const id = await createUser(leagueSlug, newUserName, newUserPin)
      setSelectedUserId(id)
      setSessionUserId(id)
      setNewUserName('')
      setNewUserPin('')
      setUnlockPin('')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUnlock = async () => {
    if (!selectedUserId || unlockPin.length !== 4) return
    setLoading(true)
    try {
      await unlockUser(leagueSlug, selectedUserId, unlockPin)
      setSessionUserId(selectedUserId)
      setUnlockPin('')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAll = async () => {
    if (!isUnlocked) return
    setLoading(true)
    setSuccess(false)

    const validPreds = Object.entries(predictions).map(([matchId, scores]) => {
      const match = matches.find(m => m.id === matchId)
      const homeScore = parseInt(scores.homeScore, 10)
      const awayScore = parseInt(scores.awayScore, 10)
      const pkHome = parseScoreValue(scores.pkHomeScore)
      const pkAway = parseScoreValue(scores.pkAwayScore)

      return {
        matchId,
        homeScore,
        awayScore,
        pkHomeScore:
          match && isKnockoutStage(match.stage) && homeScore === awayScore ? pkHome : null,
        pkAwayScore:
          match && isKnockoutStage(match.stage) && homeScore === awayScore ? pkAway : null,
      }
    }).filter(p => !isNaN(p.homeScore) && !isNaN(p.awayScore))

    try {
      await submitAllPredictions(leagueSlug, validPreds)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      alert(err.message)
      if (err.message?.includes('unlock')) {
        setSessionUserId(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const stageOrder = ['GROUP', 'R32', 'R16', 'QF', 'SF', 'THIRD', 'FINAL']
  const stages = stageOrder.filter(s => matches.some(m => m.stage === s))
  const now = new Date()

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '0.75rem' }}>Select or Create Profile</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="input select"
            style={{ flex: 1, minWidth: '200px' }}
            value={selectedUserId}
            onChange={(e) => handleSelectUser(e.target.value)}
          >
            <option value="">-- Choose Name --</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          <span>OR</span>

          <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '250px', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="input"
              placeholder="New participant"
              value={newUserName}
              onChange={e => setNewUserName(e.target.value)}
              style={{ flex: 1, minWidth: '140px' }}
            />
            <input
              type="password"
              inputMode="numeric"
              className="input"
              placeholder="4-digit PIN"
              value={newUserPin}
              onChange={e => setNewUserPin(sanitizePin(e.target.value))}
              maxLength={4}
              pattern="\d{4}"
              aria-label="4-digit PIN for new profile"
              style={{ width: '7rem' }}
            />
            <button
              className="btn"
              onClick={handleCreateUser}
              disabled={loading || !newUserName || newUserPin.length !== 4}
            >
              Add
            </button>
          </div>
        </div>

        {selectedUserId && !isUnlocked && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="password"
              inputMode="numeric"
              className="input"
              placeholder="Enter 4-digit PIN"
              value={unlockPin}
              onChange={e => setUnlockPin(sanitizePin(e.target.value))}
              maxLength={4}
              pattern="\d{4}"
              aria-label="PIN to unlock profile"
              style={{ width: '10rem' }}
            />
            <button
              className="btn"
              onClick={handleUnlock}
              disabled={loading || unlockPin.length !== 4}
            >
              Unlock
            </button>
          </div>
        )}
      </div>

      {isUnlocked && matches.length > 0 ? (
        <div className="predict-with-save-bar">
          {stages.map(stage => {
            const stageMatches = matches.filter(m => m.stage === stage)
            return (
              <div key={stage} style={{ marginBottom: '2rem' }}>
                <h3 style={{ borderBottom: '2px solid var(--text)', paddingBottom: '0.35rem', marginBottom: '0.75rem', color: 'var(--text)' }}>{stage} STAGE</h3>
                <div className="match-card-list">
                  {stageMatches.map(match => {
                    const isLocked = scoredSet.has(match.id) || now >= new Date(match.kickoffTime)
                    const scores = predictions[match.id] || emptyPrediction()
                    const homeScore = scores.homeScore
                    const awayScore = scores.awayScore
                    const hasGuess = homeScore !== '' && awayScore !== ''
                    const showPenalties =
                      isKnockoutStage(match.stage) && isRegulationDraw(homeScore, awayScore)

                    return (
                      <div key={match.id} className="card match-card" style={{ opacity: isLocked ? 0.7 : 1 }}>
                        <div suppressHydrationWarning className="match-card-meta" style={{ color: isLocked ? 'var(--danger)' : 'var(--text-muted)' }}>
                          {isLocked ? '🔒 LOCKED' : new Date(match.kickoffTime).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) + ', ' + new Date(match.kickoffTime).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: 'America/New_York' }) + ' ET'}
                        </div>
                        <div className="match-row" style={{ border: 'none', padding: 0 }}>
                          <div className="predict-score-row">
                            <div className="predict-side predict-side-home">
                              <span className="predict-team predict-team-home">
                                <TeamFlag team={match.homeTeam} />
                                <span className="predict-team-name">{match.homeTeam}</span>
                              </span>
                              {isLocked ? (
                                <span className="predict-score-fixed">{hasGuess ? homeScore : '-'}</span>
                              ) : (
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  className="input score-input"
                                  value={homeScore}
                                  onChange={e => handleUpdateScore(match.id, 'homeScore', e.target.value)}
                                  min="0"
                                  placeholder="-"
                                  aria-label={`${match.homeTeam} score`}
                                />
                              )}
                            </div>
                            <span className="predict-dash" aria-hidden="true">-</span>
                            <div className="predict-side predict-side-away">
                              {isLocked ? (
                                <span className="predict-score-fixed">{hasGuess ? awayScore : '-'}</span>
                              ) : (
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  className="input score-input"
                                  value={awayScore}
                                  onChange={e => handleUpdateScore(match.id, 'awayScore', e.target.value)}
                                  min="0"
                                  placeholder="-"
                                  aria-label={`${match.awayTeam} score`}
                                />
                              )}
                              <span className="predict-team predict-team-away">
                                <span className="predict-team-name">{match.awayTeam}</span>
                                <TeamFlag team={match.awayTeam} />
                              </span>
                            </div>
                          </div>
                        </div>
                        {showPenalties && (
                          <PenaltySection
                            homeTeam={match.homeTeam}
                            awayTeam={match.awayTeam}
                            pkHome={scores.pkHomeScore}
                            pkAway={scores.pkAwayScore}
                            locked={isLocked}
                            onPkHomeChange={(val) => handleUpdatePk(match.id, 'pkHomeScore', val)}
                            onPkAwayChange={(val) => handleUpdatePk(match.id, 'pkAwayScore', val)}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {mounted && createPortal(
            <div className="predict-save-bar">
              <button type="button" className="btn" onClick={handleSaveAll} disabled={loading} style={{ background: success ? 'var(--primary)' : 'var(--accent)', color: success ? '#fff' : '#000', boxShadow: '0 8px 16px rgba(0,0,0,0.5)', border: '2px solid #000' }}>
                {loading ? 'Saving...' : success ? '✓ All Predictions Saved' : '💾 Save All Predictions'}
              </button>
            </div>,
            document.body
          )}
        </div>
      ) : selectedUserId && !isUnlocked ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p>Enter your 4-digit PIN above to edit predictions for this profile.</p>
        </div>
      ) : selectedUserId ? (
        <div className="card" style={{ marginTop: '2rem', textAlign: 'center' }}>
          <p>No matches in the schedule.</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            If you are running the app for the first time, please go to the <a href={`/${leagueSlug}/admin`} style={{ color: 'var(--text)' }}>Admin page</a> and click <strong>&quot;Seed Match Schedule&quot;</strong> to load the 104 matches.
          </p>
        </div>
      ) : null}
    </div>
  )
}
