'use client'

import { useState, useEffect } from 'react'
import { submitAllPredictions, createOrGetUser } from '@/app/actions'
import { User, Match, Prediction } from '@prisma/client'
import { getFlag } from '@/lib/flags'

type PredictState = { [matchId: string]: { homeScore: string, awayScore: string } }

export default function PredictClient({ 
  users, 
  matches, 
  allPredictions 
}: { 
  users: User[], 
  matches: Match[],
  allPredictions: Prediction[] 
}) {
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [newUserName, setNewUserName] = useState<string>('')
  
  const [predictions, setPredictions] = useState<PredictState>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!selectedUserId) {
      setPredictions({})
      return
    }
    const userPreds = allPredictions.filter(p => p.userId === selectedUserId)
    const state: PredictState = {}
    for (const p of userPreds) {
      state[p.matchId] = { homeScore: p.homeScore.toString(), awayScore: p.awayScore.toString() }
    }
    setPredictions(state)
  }, [selectedUserId, allPredictions])

  const handleUpdateScore = (matchId: string, side: 'homeScore' | 'awayScore', val: string) => {
    setPredictions(prev => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] || { homeScore: '', awayScore: '' }),
        [side]: val
      }
    }))
  }

  const handleCreateUser = async () => {
    if (!newUserName.trim()) return
    setLoading(true)
    try {
      const id = await createOrGetUser(newUserName)
      setSelectedUserId(id)
      setNewUserName('')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAll = async () => {
    if (!selectedUserId) return
    setLoading(true)
    setSuccess(false)

    const validPreds = Object.entries(predictions).map(([matchId, scores]) => ({
      matchId,
      homeScore: parseInt(scores.homeScore),
      awayScore: parseInt(scores.awayScore)
    }))

    try {
      await submitAllPredictions(selectedUserId, validPreds)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch(err: any) {
      alert(err.message)
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
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">-- Choose Name --</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          
          <span>OR</span>

          <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '250px' }}>
            <input 
              type="text" 
              className="input" 
              placeholder="New family member name" 
              value={newUserName}
              onChange={e => setNewUserName(e.target.value)}
            />
            <button className="btn" onClick={handleCreateUser} disabled={loading || !newUserName}>
              Add
            </button>
          </div>
        </div>
      </div>

      {selectedUserId && matches.length > 0 && (
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', position: 'sticky', top: '20px', zIndex: 10 }}>
             <button className="btn" onClick={handleSaveAll} disabled={loading} style={{ background: success ? 'var(--primary)' : 'var(--accent)', color: success ? '#fff' : '#000', boxShadow: '0 8px 16px rgba(0,0,0,0.5)', border: '2px solid #000' }}>
               {loading ? 'Saving...' : success ? '✓ Saved Globally!' : '💾 Save All Predictions'}
             </button>
          </div>

          <br/>

          {stages.map(stage => {
            const stageMatches = matches.filter(m => m.stage === stage)
            return (
              <div key={stage} style={{ marginBottom: '3rem' }}>
                <h3 style={{ borderBottom: '2px solid var(--accent)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--accent)' }}>{stage} STAGE</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {stageMatches.map(match => {
                    const isLocked = now >= new Date(match.kickoffTime)
                    const homeFlag = getFlag(match.homeTeam)
                    const awayFlag = getFlag(match.awayTeam)
                    
                    return (
                      <div key={match.id} className="card" style={{ opacity: isLocked ? 0.7 : 1, padding: '1rem' }}>
                         <div style={{ fontSize: '0.85rem', color: isLocked ? 'var(--danger)' : 'var(--text-muted)', marginBottom: '0.5rem', textAlign: 'right' }}>
                          {isLocked ? '🔒 LOCKED' : new Date(match.kickoffTime).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) + ', ' + new Date(match.kickoffTime).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: 'America/New_York' }) + ' ET'}
                        </div>
                        <div className="match-row" style={{ border: 'none', padding: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                            <span style={{ flex: 1, textAlign: 'right' }}>{homeFlag} {match.homeTeam}</span>
                            <input 
                              type="number" 
                              className="input score-input" 
                              value={predictions[match.id]?.homeScore ?? ''}
                              onChange={e => handleUpdateScore(match.id, 'homeScore', e.target.value)}
                              disabled={isLocked}
                              min="0"
                              placeholder="-"
                            />
                            <span>-</span>
                            <input 
                              type="number" 
                              className="input score-input" 
                              value={predictions[match.id]?.awayScore ?? ''}
                              onChange={e => handleUpdateScore(match.id, 'awayScore', e.target.value)}
                              disabled={isLocked}
                              min="0"
                              placeholder="-"
                            />
                            <span style={{ flex: 1, textAlign: 'left' }}>{match.awayTeam} {awayFlag}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
