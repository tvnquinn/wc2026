/**
 * Rename league participants without changing PINs or predictions.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/rename-users.ts
 *   DATABASE_URL=... LEAGUE_SLUG=sleepwell npx tsx scripts/rename-users.ts
 */
import { prisma } from '../src/lib/prisma'

const DEFAULT_LEAGUE_SLUG = process.env.LEAGUE_SLUG?.trim() || 'sleepwell'

const RENAMES: Array<{ from: string; to: string }> = [
  { from: 'Casey', to: "Casey Labeat Y'all" },
  { from: 'coco', to: 'cocopirlo' },
  { from: 'oliver ronaldo is goated', to: 'CR7 is HIM' },
]

async function main() {
  const league = await prisma.league.findUnique({ where: { slug: DEFAULT_LEAGUE_SLUG } })
  if (!league) {
    throw new Error(`League not found: ${DEFAULT_LEAGUE_SLUG}`)
  }

  for (const { from, to } of RENAMES) {
    const user = await prisma.user.findUnique({
      where: { leagueId_name: { leagueId: league.id, name: from } },
    })

    if (!user) {
      console.warn(`Skip "${from}" — not found in ${DEFAULT_LEAGUE_SLUG}`)
      continue
    }

    const nameTaken = await prisma.user.findUnique({
      where: { leagueId_name: { leagueId: league.id, name: to } },
    })
    if (nameTaken && nameTaken.id !== user.id) {
      throw new Error(`Cannot rename "${from}" to "${to}" — name already taken`)
    }

    if (user.name === to) {
      console.log(`Already renamed: "${from}" -> "${to}"`)
      continue
    }

    const predictionCount = await prisma.prediction.count({ where: { userId: user.id } })

    await prisma.user.update({
      where: { id: user.id },
      data: { name: to },
    })

    console.log(
      `Renamed "${from}" -> "${to}" (${predictionCount} predictions kept, PIN unchanged)`
    )
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
