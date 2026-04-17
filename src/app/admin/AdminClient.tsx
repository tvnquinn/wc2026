'use client'

import { useState } from 'react'
import { setMatchResult, seedDatabase } from '@/app/actions'
import { Match } from '@prisma/client'

export default function AdminClient({ matches }: { matches: Match[] }) {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({})
  const [successIds, setSuccessIds] = useState<Record<string, boolean>>({})
  const [isSeeding, setIsSeeding] = useState(false)

  // extremely simple frontend-only auth for family group
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === 'coco') {
      setAuthenticated(true)
    } else {
      alert('Incorrect admin password')
    }
  }

  const handleResult = async (matchId: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    setLoadingIds(prev => ({ ...prev, [matchId]: true }))
    setSuccessIds(prev => ({ ...prev, [matchId]: false }))

    const formData = new FormData(e.currentTarget)
    const homeScore = formData.get('homeScore') as string
    const awayScore = formData.get('awayScore') as string

    try {
      await setMatchResult(matchId, homeScore, awayScore)
      setSuccessIds(prev => ({ ...prev, [matchId]: true }))
      setTimeout(() => setSuccessIds(prev => ({ ...prev, [matchId]: false })), 3000)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoadingIds(prev => ({ ...prev, [matchId]: false }))
    }
  }

  const handleSeed = async () => {
    if (!confirm("This will WIPE all predictions and reset the 104 matches. Are you sure?")) return
    setIsSeeding(true)
    const res = await seedDatabase()
    setIsSeeding(false)
    if (res.success) {
      alert("Database initialized successfully! Refresh the page to see matches.")
      window.location.reload()
    } else {
      alert("Error seeding database: " + res.error)
    }
  }

  if (!authenticated) {
    return (
      <div className="card" style={{ maxWidth: '400px', margin: '4rem auto' }}>
        <h2>Admin Access</h2>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="password" 
            className="input" 
            placeholder="Enter password (hint: coco)" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn">Login</button>
        </form>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card" style={{ textAlign: 'center', border: '1px dashed var(--accent)' }}>
        <h3 style={{ marginBottom: '1rem' }}>Database Management</h3>
        <p style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>Use this only for the first-time setup or to completely reset the tournament data.</p>
        <button 
          onClick={handleSeed} 
          className="btn" 
          style={{ background: 'var(--danger)' }}
          disabled={isSeeding}
        >
          {isSeeding ? 'Seeding...' : 'Reset & Seed Database'}
        </button>
      </div>
      
      {matches.map(match => (
        <div key={match.id} className="card" style={{ border: match.isFinished ? '1px solid var(--primary)' : '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--accent)' }}>{match.stage}</span>
            <span style={{ fontSize: '0.9rem', color: match.isFinished ? 'var(--primary)' : 'var(--text-muted)' }}>
              {match.isFinished ? '✓ Finished' : new Date(match.kickoffTime).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) + ', ' + new Date(match.kickoffTime).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: 'America/New_York' }) + ' ET'}
            </span>
          </div>
          
          <form onSubmit={(e) => handleResult(match.id, e)} className="match-row" style={{ border: 'none', padding: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
              <span style={{ flex: 1, textAlign: 'right' }}>{match.homeTeam}</span>
              <input 
                type="number" 
                name="homeScore"
                className="input score-input" 
                defaultValue={match.homeScore ?? ''}
                required
                min="0"
              />
              <span>-</span>
              <input 
                type="number" 
                name="awayScore"
                className="input score-input" 
                defaultValue={match.awayScore ?? ''}
                required
                min="0"
              />
              <span style={{ flex: 1, textAlign: 'left' }}>{match.awayTeam}</span>
            </div>
            
            <div style={{ minWidth: '100px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn danger" disabled={loadingIds[match.id]}>
                {loadingIds[match.id] ? '...' : successIds[match.id] ? '✓ Updated' : 'Set Result'}
              </button>
            </div>
          </form>
        </div>
      ))}
    </div>
  )
}
