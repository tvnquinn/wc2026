import { prisma } from '@/lib/prisma'
import AdminClient from './AdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const matches = await prisma.match.findMany({
    orderBy: { kickoffTime: 'desc' }
  })
  
  return (
    <div>
      <h1>Admin Panel</h1>
      <AdminClient matches={matches} />
    </div>
  )
}
