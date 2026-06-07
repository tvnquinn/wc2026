'use client'

import { useState } from 'react'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import GlobalHeader from '@/components/GlobalHeader'
import { createLeague } from '@/app/actions'

export default function CreateLeaguePage() {
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await createLeague(slug, name, adminPassword)
    } catch (err: unknown) {
      if (isRedirectError(err)) throw err
      const message = err instanceof Error ? err.message : 'Could not create league'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <>
      <GlobalHeader />
      <div style={{ maxWidth: '480px', margin: '2rem auto', padding: '0 1rem' }}>
        <h1>Create a League</h1>
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label>
            <span style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.9rem' }}>URL slug</span>
            <input
              className="input"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="e.g. smith-family"
              required
              pattern="[a-z0-9][a-z0-9-]{1,30}[a-z0-9]"
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Your league will live at /{slug || 'your-slug'}
            </span>
          </label>

          <label>
            <span style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.9rem' }}>League name</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Smith Family"
              required
              maxLength={60}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Shown in the header as WC26 Pool - {name.trim() || 'Your Name'}
            </span>
          </label>

          <label>
            <span style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.9rem' }}>Admin password</span>
            <input
              type="password"
              className="input"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Used to enter match results"
              required
              minLength={4}
            />
          </label>

          {error && <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</p>}

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Creating...' : 'Create League'}
          </button>
        </form>
      </div>
    </>
  )
}
