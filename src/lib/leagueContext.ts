import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { ensureDefaultLeague } from '@/lib/ensureDefaultLeague'
import { hostLeagueSlugForDeploy, isHostOnlyDeploy } from '@/lib/deployMode'

export async function getLeagueBySlug(slug: string) {
  await ensureDefaultLeague()
  const normalized = slug.toLowerCase()
  if (isHostOnlyDeploy() && normalized !== hostLeagueSlugForDeploy()) {
    notFound()
  }
  const league = await prisma.league.findUnique({ where: { slug: normalized } })
  if (!league) notFound()
  return league
}

export async function getPublicLeagues() {
  await ensureDefaultLeague()
  const hostSlug = hostLeagueSlugForDeploy()
  return prisma.league.findMany({
    where: isHostOnlyDeploy() ? { slug: hostSlug } : { isPublic: true },
    orderBy: { createdAt: 'asc' },
    select: { slug: true, name: true, description: true },
  })
}
