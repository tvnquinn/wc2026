import Link from 'next/link'
import GlobalHeader from '@/components/GlobalHeader'
import { getPublicLeagues } from '@/lib/leagueContext'
import { formatLeagueBrand } from '@/lib/leagueDisplay'

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const leagues = await getPublicLeagues()

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

        {leagues.length > 0 && (
          <div className="card">
            <h2 style={{ marginBottom: '1rem' }}>Public leagues</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {leagues.map((league) => (
                <Link
                  key={league.slug}
                  href={`/${league.slug}`}
                  className="match-row"
                  style={{ textDecoration: 'none', color: 'inherit', padding: '0.75rem 0' }}
                >
                  <div>
                    <strong>{formatLeagueBrand(league.name)}</strong>
                    {league.description && (
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {league.description}
                      </p>
                    )}
                  </div>
                  <span style={{ color: 'var(--primary)' }}>/{league.slug} →</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
