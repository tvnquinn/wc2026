import { prisma } from '@/lib/prisma'
import { formatMD, getETDateKey, pickSparseTicks } from '@/lib/chart'
import { getLeagueBySlug } from '@/lib/leagueContext'
import { isScoredForLeague, effectiveInputForMatch } from '@/lib/effectiveResults'
import LeaderboardChart from '@/components/LeaderboardChart'

export const dynamic = 'force-dynamic'

export default async function LeagueHomePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const league = await getLeagueBySlug(slug)

  const [users, matches, overrides] = await Promise.all([
    prisma.user.findMany({
      where: { leagueId: league.id },
      include: { predictions: true },
    }),
    prisma.match.findMany({ orderBy: { kickoffTime: 'asc' } }),
    prisma.leagueResultOverride.findMany({ where: { leagueId: league.id } }),
  ])

  const overrideByMatchId = new Map(overrides.map((o) => [o.matchId, o]))

  const leaderboard = users
    .map((user) => {
      const totalPoints = user.predictions.reduce((sum, p) => sum + p.points, 0)
      return { ...user, totalPoints }
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)

  const chartData = [{ name: 'Start', ...Object.fromEntries(leaderboard.map((u) => [u.name, 0])) }]

  const finishedMatches = matches.filter((m) =>
    isScoredForLeague(effectiveInputForMatch(m, overrideByMatchId.get(m.id)))
  )
  const matchesByDay = new Map<string, typeof finishedMatches>()

  for (const match of finishedMatches) {
    const dayKey = getETDateKey(match.kickoffTime)
    const dayMatches = matchesByDay.get(dayKey) ?? []
    dayMatches.push(match)
    matchesByDay.set(dayKey, dayMatches)
  }

  const sortedDayKeys = [...matchesByDay.keys()].sort()
  const currentScores: Record<string, number> = Object.fromEntries(
    leaderboard.map((u) => [u.name, 0])
  )

  for (const dayKey of sortedDayKeys) {
    const dayMatches = matchesByDay.get(dayKey)!
    for (const match of dayMatches) {
      for (const user of leaderboard) {
        const pred = user.predictions.find((p) => p.matchId === match.id)
        if (pred && pred.points > 0) {
          currentScores[user.name] += pred.points
        }
      }
    }
    chartData.push({
      name: formatMD(dayMatches[0].kickoffTime),
      ...currentScores,
    })
  }

  const xTicks = pickSparseTicks(chartData.map((d) => d.name))
  const colors = ['#3CAC3B', '#3b82f6', '#fbbf24', '#E61D25', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#84cc16', '#a855f7']
  const lines = leaderboard.map((u, i) => ({ key: u.name, color: colors[i % colors.length] }))

  return (
    <div>
      <h1>🏆 Current Standings</h1>

      <LeaderboardChart data={chartData} lines={lines} xTicks={xTicks} />

      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        {leaderboard.map((user, index) => (
          <div key={user.id} className="match-row" style={{ padding: '0.8rem 0' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ color: index < 3 ? 'var(--text)' : 'var(--text-muted)', width: '30px' }}>
                {index + 1}.
              </span>
              <span>{user.name}</span>
            </div>
            <div style={{ color: 'var(--primary)' }}>{user.totalPoints} pts</div>
          </div>
        ))}
        {leaderboard.length === 0 && (
          <p style={{ textAlign: 'center' }}>No participants yet.</p>
        )}
      </div>
    </div>
  )
}
