'use client'

import { useState } from 'react'
import { seedDatabase } from '@/app/actions'
import { Match } from '@prisma/client'
import AdminMatchRow from './AdminMatchRow'

export default function AdminClient({ matches }: { matches: Match[] }) {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)

  // extremely simple frontend-only auth for family group
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === 'potty') {
      setAuthenticated(true)
    } else {
      alert('Incorrect admin password')
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
        <h2>Login as admin to update real match scores</h2>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="password" 
            className="input" 
            placeholder="Enter password (hint: potty)" 
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
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="card" style={{ textAlign: 'center', border: '1px dashed var(--text)' }}>
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
        <AdminMatchRow key={match.id} match={match} />
      ))}
    </div>
  )
}
