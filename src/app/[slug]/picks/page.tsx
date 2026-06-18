import { prisma } from '@/lib/prisma'
import { getLeagueBySlug } from '@/lib/leagueContext'
import { matchDisplayForLeague } from '@/lib/effectiveResults'
import { refreshJackpotForLeague } from '@/lib/recalculateJackpot'
import JackpotBanner from '@/components/JackpotBanner'
import PicksGrid from './PicksGrid'

export const dynamic = 'force-dynamic'

export default async function PicksPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const league = await getLeagueBySlug(slug)

  await refreshJackpotForLeague(league.id)

  const [leagueRow, users, matches, overrides, predictions] = await Promise.all([
    prisma.league.findUniqueOrThrow({
      where: { id: league.id },
      select: { jackpotBalance: true },
    }),
    prisma.user.findMany({ where: { leagueId: league.id }, orderBy: { name: 'asc' } }),
    prisma.match.findMany({ orderBy: { kickoffTime: 'asc' } }),
    prisma.leagueResultOverride.findMany({ where: { leagueId: league.id } }),
    prisma.prediction.findMany({ where: { user: { leagueId: league.id } } }),
  ])

  const overrideByMatchId = new Map(overrides.map((o) => [o.matchId, o]))
  const leagueMatches = matches.map((match) =>
    matchDisplayForLeague(match, overrideByMatchId.get(match.id))
  )

  return (
    <div>
      <h1>Predictions</h1>

      <JackpotBanner balance={leagueRow.jackpotBalance} alwaysShow />

      <p style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        Everyone&apos;s predicted scores. Blank cells mean no pick yet.
      </p>
      <PicksGrid matches={leagueMatches} users={users} predictions={predictions} />
    </div>
  )
}
