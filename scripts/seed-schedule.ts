/**
 * One-time CLI to load the global 104-match schedule from matches.csv.
 * Idempotent: skips if matches already exist.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/seed-schedule.ts
 */
import { PrismaClient } from '@prisma/client'
import { seedGlobalMatches } from '../src/lib/seedMatches'

const prisma = new PrismaClient()

async function main() {
  const before = await prisma.match.count()
  const result = await seedGlobalMatches()
  const after = await prisma.match.count()

  if (result.skipped) {
    console.log(`Schedule already seeded (${after} matches in DB).`)
  } else {
    console.log(`Seeded ${after - before} matches (${after} total).`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
