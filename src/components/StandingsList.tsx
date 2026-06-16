'use client'

type StandingsEntry = {
  id: string
  name: string
  totalPoints: number
  rank: number
  color: string
}

export default function StandingsList({ entries }: { entries: StandingsEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="card standings-list" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ textAlign: 'center' }}>No participants yet.</p>
      </div>
    )
  }

  return (
    <div className="standings-list" style={{ maxWidth: '600px', margin: '0 auto' }}>
      {entries.map((user) => (
        <div key={user.id} className="card standings-card">
          <div className="standings-card-rank" aria-hidden="true">
            {user.rank}
          </div>
          <div className="standings-card-body">
            <span className="standings-card-name" style={{ color: user.color }}>
              {user.name}
            </span>
            <span className="standings-card-points">{user.totalPoints} pts</span>
          </div>
        </div>
      ))}
    </div>
  )
}
