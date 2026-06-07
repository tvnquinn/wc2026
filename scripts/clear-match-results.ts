/**
 * Clears all match results (global + per-league overrides). Schedule/teams stay intact.
 * Usage: DATABASE_URL=... npx tsx scripts/clear-match-results.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const [global, overrides, predictions] = await Promise.all([
    prisma.match.updateMany({
      data: {
        homeScore: null,
        awayScore: null,
        pkHomeScore: null,
        pkAwayScore: null,
        isFinished: false,
      },
    }),
    prisma.leagueResultOverride.deleteMany(),
    prisma.prediction.updateMany({ data: { points: 0 } }),
  ])

  console.log(`Cleared ${global.count} global match results`)
  console.log(`Deleted ${overrides.count} league result overrides`)
  console.log(`Reset points on ${predictions.count} predictions`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
