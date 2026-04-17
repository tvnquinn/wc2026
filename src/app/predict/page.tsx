import { prisma } from '@/lib/prisma'
import PredictClient from './PredictClient'

export const dynamic = 'force-dynamic'

export default async function PredictPage() {
  const users = await prisma.user.findMany()
  const matches = await prisma.match.findMany({
    where: { isFinished: false },
    orderBy: { kickoffTime: 'asc' }
  })
  
  const allPredictions = await prisma.prediction.findMany()

  return (
    <div>
      <h1>Make Predictions</h1>
      <PredictClient users={users} matches={matches} allPredictions={allPredictions} />
    </div>
  )
}
