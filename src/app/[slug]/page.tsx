import { prisma } from '@/lib/prisma'
import { pickSparseTicks } from '@/lib/chart'
import { getLeagueBySlug } from '@/lib/leagueContext'
import { isScoredForLeague, effectiveInputForMatch } from '@/lib/effectiveResults'
import { assignCompetitionRanks } from '@/lib/leaderboardRank'
import { refreshJackpotForLeague } from '@/lib/recalculateJackpot'
import { resolveMatchNumById } from '@/lib/matchNumResolution'
import {
  buildScoreHistoryChartData,
  jackpotPayoutsByMatchNum,
} from '@/lib/scoreHistoryChart'
import { userColorMap } from '@/lib/userColors'
import LeaderboardChart from '@/components/LeaderboardChart'
import StandingsList from '@/components/StandingsList'

export const dynamic = 'force-dynamic'

export default async function LeagueHomePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const league = await getLeagueBySlug(slug)

  const jackpotReplay = await refreshJackpotForLeague(league.id)

  const [users, matches, overrides] = await Promise.all([
    prisma.user.findMany({
      where: { leagueId: league.id },
      orderBy: { name: 'asc' },
      include: { predictions: true },
    }),
    prisma.match.findMany({ orderBy: { kickoffTime: 'asc' } }),
    prisma.leagueResultOverride.findMany({ where: { leagueId: league.id } }),
  ])

  const overrideByMatchId = new Map(overrides.map((o) => [o.matchId, o]))
  const matchNumById = resolveMatchNumById(matches)

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

  const finishedMatches = matches
    .filter((m) => isScoredForLeague(effectiveInputForMatch(m, overrideByMatchId.get(m.id))))
    .map((m) => ({
      id: m.id,
      matchNum: matchNumById.get(m.id) ?? m.matchNum,
      kickoffTime: m.kickoffTime,
    }))

  const chartData = buildScoreHistoryChartData({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      predictions: u.predictions.map((p) => ({ matchId: p.matchId, points: p.points })),
    })),
    finishedMatches,
    jackpotPayoutsByMatchNum: jackpotPayoutsByMatchNum(jackpotReplay?.events ?? []),
  })

  const xTicks = pickSparseTicks(chartData.map((d) => String(d.name)))
  const lines = users.map((user) => ({
    key: user.name,
    color: colorByUserId.get(user.id) ?? '#3b82f6',
  }))

  return (
    <div>
      <h1>🏆 Current Standings</h1>

      <LeaderboardChart data={chartData} lines={lines} xTicks={xTicks} />

      <StandingsList entries={leaderboard} />
    </div>
  )
}
