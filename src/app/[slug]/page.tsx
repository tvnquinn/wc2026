import { prisma } from '@/lib/prisma'
import { formatMD, getETDateKey, pickSparseTicks } from '@/lib/chart'
import { getLeagueBySlug } from '@/lib/leagueContext'
import { isScoredForLeague, effectiveInputForMatch } from '@/lib/effectiveResults'
import { assignCompetitionRanks } from '@/lib/leaderboardRank'
import { refreshJackpotForLeague } from '@/lib/recalculateJackpot'
import { userColorMap } from '@/lib/userColors'
import LeaderboardChart from '@/components/LeaderboardChart'
import JackpotBanner from '@/components/JackpotBanner'
import StandingsList from '@/components/StandingsList'

export const dynamic = 'force-dynamic'

export default async function LeagueHomePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const league = await getLeagueBySlug(slug)

  await refreshJackpotForLeague(league.id)

  const [leagueRow, users, matches, overrides] = await Promise.all([
    prisma.league.findUniqueOrThrow({
      where: { id: league.id },
      select: { jackpotBalance: true },
    }),
    prisma.user.findMany({
      where: { leagueId: league.id },
      orderBy: { name: 'asc' },
      include: { predictions: true },
    }),
    prisma.match.findMany({ orderBy: { kickoffTime: 'asc' } }),
    prisma.leagueResultOverride.findMany({ where: { leagueId: league.id } }),
  ])

  const overrideByMatchId = new Map(overrides.map((o) => [o.matchId, o]))

  const colorByUserId = userColorMap(users)

  const leaderboard = assignCompetitionRanks(
    users
      .map((user) => {
        const matchPoints = user.predictions.reduce((sum, p) => sum + p.points, 0)
        const totalPoints = matchPoints + user.jackpotWinnings
        return {
          id: user.id,
          name: user.name,
          matchPoints,
          jackpotWinnings: user.jackpotWinnings,
          totalPoints,
        }
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)
  ).map((entry) => ({
    ...entry,
    color: colorByUserId.get(entry.id) ?? '#3b82f6',
  }))

  const chartData = [{ name: 'Start', ...Object.fromEntries(users.map((u) => [u.name, 0])) }]

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
    users.map((u) => [u.name, 0])
  )

  for (const dayKey of sortedDayKeys) {
    const dayMatches = matchesByDay.get(dayKey)!
    for (const match of dayMatches) {
      for (const user of users) {
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
  const lines = users.map((user) => ({
    key: user.name,
    color: colorByUserId.get(user.id) ?? '#3b82f6',
  }))

  return (
    <div>
      <h1>🏆 Current Standings</h1>

      <JackpotBanner balance={leagueRow.jackpotBalance} />

      <LeaderboardChart data={chartData} lines={lines} xTicks={xTicks} />

      <StandingsList entries={leaderboard} />
    </div>
  )
}
