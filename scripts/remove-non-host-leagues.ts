/**
 * Removes every league except the host (sleepwell). Local/ops only.
 * Usage: DATABASE_URL=... npx tsx scripts/remove-non-host-leagues.ts
 */
import { PrismaClient } from '@prisma/client'
import { GLOBAL_SCORER_SLUG } from '../src/lib/league'

const prisma = new PrismaClient()
const hostSlug = process.env.HOST_LEAGUE_SLUG?.trim().toLowerCase() || GLOBAL_SCORER_SLUG

async function main() {
  const removed = await prisma.league.deleteMany({
    where: { slug: { not: hostSlug } },
  })
  console.log(`Removed ${removed.count} non-host leagues (kept /${hostSlug})`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
