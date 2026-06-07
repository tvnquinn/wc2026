import { prisma } from '@/lib/prisma'
import { updateR32TeamsFromGroupStage } from '@/lib/r32Update'
import { getLeagueBySlug } from '@/lib/leagueContext'
import { getAdminSessionLeagueId } from '@/app/actions'
import { isGlobalScorerLeague } from '@/lib/league'
import AdminClient from './AdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const league = await getLeagueBySlug(slug)

  await updateR32TeamsFromGroupStage()

  const [matches, overrides, adminLeagueId] = await Promise.all([
    prisma.match.findMany({ orderBy: { kickoffTime: 'asc' } }),
    prisma.leagueResultOverride.findMany({ where: { leagueId: league.id } }),
    getAdminSessionLeagueId(),
  ])

  const isAdminAuthenticated = adminLeagueId === league.id

  return (
    <div>
      <h1>Admin</h1>
      <AdminClient
        leagueSlug={slug}
        isGlobalScorer={isGlobalScorerLeague(slug)}
        matches={matches}
        overrides={overrides}
        initialAuthenticated={isAdminAuthenticated}
      />
    </div>
  )
}
