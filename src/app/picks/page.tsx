import { prisma } from '@/lib/prisma'
import PicksGrid from './PicksGrid'

export const dynamic = 'force-dynamic'

export default async function PicksPage() {
  const [users, matches, predictions] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
    prisma.match.findMany({ orderBy: { kickoffTime: 'asc' } }),
    prisma.prediction.findMany(),
  ])

  return (
    <div>
      <h1>Predictions</h1>
      <p style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        Everyone&apos;s predicted scores. Blank cells mean no pick yet.
      </p>
      <PicksGrid matches={matches} users={users} predictions={predictions} />
    </div>
  )
}
