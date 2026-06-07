import Link from 'next/link'
import GlobalHeader from '@/components/GlobalHeader'

export const dynamic = 'force-dynamic'

export default function LandingPage() {
  return (
    <>
      <GlobalHeader />
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 1rem' }}>
        <h1 style={{ textAlign: 'center', marginTop: '2rem' }}>World Cup 2026 Prediction Pool</h1>
        <p style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-muted)' }}>
          Create a private league, share the link, and compete on every match.
        </p>

        <div className="card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '0.75rem' }}>Start a new league</h2>
          <p style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>
            Pick a short URL slug, set an admin password, and invite your group.
          </p>
          <Link href="/create" className="btn" style={{ display: 'inline-block' }}>
            Create League
          </Link>
        </div>
      </div>
    </>
  )
}
