/**
 * Backfill missing Match.matchNum from matches.csv (kickoff-order pairing).
 *
 * Usage: DATABASE_URL=... npx tsx scripts/backfill-match-nums.ts
 */
import { PrismaClient } from '@prisma/client'
import { ensureMatchNumsBackfilled } from '../src/lib/matchNumResolution'

const prisma = new PrismaClient()

async function main() {
  const before = await prisma.match.count({ where: { matchNum: null } })
  await ensureMatchNumsBackfilled()
  const after = await prisma.match.count({ where: { matchNum: null } })
  console.log(`Backfilled matchNum: ${before} missing → ${after} missing`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
