/**
 * Prepares an isolated league for Playwright E2E runs.
 * Usage: npx tsx scripts/seed-e2e-league.ts
 */
import { PrismaClient } from '@prisma/client'
import { hashSecret } from '../src/lib/auth'
import { E2E_ADMIN_PASSWORD, E2E_SLUG } from '../e2e/constants'
import { ensureDefaultLeague } from '../src/lib/ensureDefaultLeague'
import { seedGlobalMatches } from '../src/lib/seedMatches'

const prisma = new PrismaClient()

async function main() {
  await ensureDefaultLeague()
  await seedGlobalMatches()

  let league = await prisma.league.findUnique({ where: { slug: E2E_SLUG } })

  if (!league) {
    league = await prisma.league.create({
      data: {
        slug: E2E_SLUG,
        name: 'E2E Test League',
        adminPasswordHash: hashSecret(E2E_ADMIN_PASSWORD),
        isPublic: false,
        useGlobalResults: true,
      },
    })
  } else {
    await prisma.prediction.deleteMany({
      where: { user: { leagueId: league.id } },
    })
    await prisma.user.deleteMany({ where: { leagueId: league.id } })
    await prisma.leagueResultOverride.deleteMany({ where: { leagueId: league.id } })
  }

  const matchCount = await prisma.match.count()
  console.log(`E2E league ready: /${E2E_SLUG} (${matchCount} matches)`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
