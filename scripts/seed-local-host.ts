/**
 * Seeds the local host league (/sleepwell) and global match schedule.
 * Usage: DATABASE_URL=file:./prisma/dev.db npx tsx scripts/seed-local-host.ts
 */
import { PrismaClient } from '@prisma/client'
import { ensureDefaultLeague } from '../src/lib/ensureDefaultLeague'
import { seedGlobalMatches } from '../src/lib/seedMatches'
import { resolveHostLeagueSlug } from '../src/lib/league'

const prisma = new PrismaClient()

async function main() {
  const league = await ensureDefaultLeague()
  const schedule = await seedGlobalMatches()
  const matchCount = await prisma.match.count()

  console.log(`Host league ready: /${league.slug} (${league.name})`)
  console.log(
    schedule.skipped
      ? `Schedule already present (${matchCount} matches).`
      : `Seeded schedule (${matchCount} matches).`,
  )
  console.log(`Open http://localhost:${process.env.PORT ?? '3000'}/${resolveHostLeagueSlug()}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
