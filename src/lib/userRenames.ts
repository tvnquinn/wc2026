import { prisma } from '@/lib/prisma'

export const SCHEDULED_USER_RENAMES: Array<{ from: string; to: string }> = [
  { from: 'Casey', to: "Casey Labeat Y'all" },
  { from: 'coco', to: 'cocopirlo' },
  { from: 'oliver ronaldo is goated', to: 'CR7 is HIM' },
]

export async function applyScheduledUserRenames(leagueSlug = 'sleepwell') {
  const league = await prisma.league.findUnique({ where: { slug: leagueSlug } })
  if (!league) return

  for (const { from, to } of SCHEDULED_USER_RENAMES) {
    const user = await prisma.user.findUnique({
      where: { leagueId_name: { leagueId: league.id, name: from } },
    })
    if (!user) continue

    const nameTaken = await prisma.user.findUnique({
      where: { leagueId_name: { leagueId: league.id, name: to } },
    })
    if (nameTaken && nameTaken.id !== user.id) continue
    if (user.name === to) continue

    await prisma.user.update({
      where: { id: user.id },
      data: { name: to },
    })
  }
}
