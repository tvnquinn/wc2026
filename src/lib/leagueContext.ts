import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { ensureDefaultLeague } from '@/lib/ensureDefaultLeague'

export async function getLeagueBySlug(slug: string) {
  await ensureDefaultLeague()
  const league = await prisma.league.findUnique({ where: { slug: slug.toLowerCase() } })
  if (!league) notFound()
  return league
}

export async function getPublicLeagues() {
  await ensureDefaultLeague()
  return prisma.league.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: 'asc' },
    select: { slug: true, name: true, description: true },
  })
}
