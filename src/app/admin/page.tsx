import { prisma } from '@/lib/prisma'
import AdminClient from './AdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const matches = await prisma.match.findMany({
    orderBy: { kickoffTime: 'asc' }
  })
  
  return (
    <div>
      <h1>Enter Results</h1>
      <AdminClient matches={matches} />
    </div>
  )
}
