import { prisma } from '@/lib/prisma'
import LeaderboardChart from './LeaderboardChart'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const users = await prisma.user.findMany({
    include: { predictions: true }
  })
  
  const matches = await prisma.match.findMany({
    orderBy: { kickoffTime: 'asc' }
  })

  // Calculate total points for each user
  const leaderboard = users.map(user => {
    const totalPoints = user.predictions.reduce((sum, p) => sum + p.points, 0)
    return { ...user, totalPoints }
  }).sort((a, b) => b.totalPoints - a.totalPoints)

  // Data for chart: start with 0 for everyone
  const chartData = [{ name: 'Start', ...Object.fromEntries(leaderboard.map(u => [u.name, 0])) }]
  
  const finishedMatches = matches.filter(m => m.isFinished)
  
  let currentScores: Record<string, number> = Object.fromEntries(leaderboard.map(u => [u.name, 0]))

  for (const match of finishedMatches) {
    for (const user of leaderboard) {
      const pred = user.predictions.find(p => p.matchId === match.id)
      if (pred && pred.points > 0) {
        currentScores[user.name] += pred.points
      }
    }
    chartData.push({
      name: `${match.stage} (${match.homeTeam.substring(0,3)}v${match.awayTeam.substring(0,3)})`,
      ...currentScores
    })
  }

  const colors = ['#10b981', '#3b82f6', '#fbbf24', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#84cc16', '#a855f7']
  const lines = leaderboard.map((u, i) => ({ key: u.name, color: colors[i % colors.length] }))

  return (
    <div>
      <h1>🏆 Current Standings</h1>
      
      <LeaderboardChart data={chartData} lines={lines} />

      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        {leaderboard.map((user, index) => (
          <div key={user.id} className="match-row" style={{ padding: '0.8rem 0' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ 
                color: index === 0 ? 'var(--accent)' : index < 3 ? 'var(--text)' : 'var(--text-muted)', 
                width: '30px' 
              }}>
                {index + 1}.
              </span>
              <span>
                {user.name}
              </span>
            </div>
            <div style={{ color: 'var(--primary)' }}>
              {user.totalPoints} pts
            </div>
          </div>
        ))}
        {leaderboard.length === 0 && (
          <p style={{ textAlign: 'center' }}>No participants yet.</p>
        )}
      </div>
    </div>
  )
}
