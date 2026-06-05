import { prisma } from '@/lib/prisma'
import { getPredictSession } from '@/app/actions'
import PredictClient from './PredictClient'

export const dynamic = 'force-dynamic'

export default async function PredictPage() {
  const [users, matches, allPredictions, initialSessionUserId] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.match.findMany({ orderBy: { kickoffTime: 'asc' } }),
    prisma.prediction.findMany(),
    getPredictSession(),
  ])

  return (
    <div>
      <h1>Make Predictions</h1>
      <PredictClient
        users={users}
        matches={matches}
        allPredictions={allPredictions}
        initialSessionUserId={initialSessionUserId}
      />
    </div>
  )
}
