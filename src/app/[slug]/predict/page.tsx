import { prisma } from '@/lib/prisma'
import { getPredictSession } from '@/app/actions'
import { getLeagueBySlug } from '@/lib/leagueContext'
import { effectiveInputForMatch, isScoredForLeague } from '@/lib/effectiveResults'
import PredictClient from './PredictClient'

export const dynamic = 'force-dynamic'

export default async function PredictPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const league = await getLeagueBySlug(slug)

  const [users, matches, overrides, allPredictions, initialSessionUserId] = await Promise.all([
    prisma.user.findMany({
      where: { leagueId: league.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.match.findMany({ orderBy: { kickoffTime: 'asc' } }),
    prisma.leagueResultOverride.findMany({ where: { leagueId: league.id } }),
    prisma.prediction.findMany({
      where: { user: { leagueId: league.id } },
    }),
    getPredictSession(slug),
  ])

  const overrideByMatchId = new Map(overrides.map((o) => [o.matchId, o]))
  const scoredMatchIds = matches
    .filter((match) =>
      isScoredForLeague(effectiveInputForMatch(match, overrideByMatchId.get(match.id)))
    )
    .map((m) => m.id)

  return (
    <div>
      <h1>Make Predictions</h1>
      <PredictClient
        leagueSlug={slug}
        users={users}
        matches={matches}
        scoredMatchIds={scoredMatchIds}
        allPredictions={allPredictions}
        initialSessionUserId={initialSessionUserId}
      />
    </div>
  )
}
