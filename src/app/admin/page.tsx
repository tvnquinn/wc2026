import { prisma } from '@/lib/prisma'
import { updateR32TeamsFromGroupStage } from '@/lib/r32Update'
import AdminClient from './AdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  await updateR32TeamsFromGroupStage()

  const matches = await prisma.match.findMany({
    orderBy: { kickoffTime: 'asc' }
  })
  
  return (
    <div>
      <h1>Admin</h1>
      <AdminClient matches={matches} />
    </div>
  )
}
