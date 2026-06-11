/**
 * Rename league participants without changing PINs or predictions.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/rename-users.ts
 *   DATABASE_URL=... LEAGUE_SLUG=sleepwell npx tsx scripts/rename-users.ts
 */
import { prisma } from '@/lib/prisma'
import { applyScheduledUserRenames } from '../src/lib/userRenames'

async function main() {
  await applyScheduledUserRenames(process.env.LEAGUE_SLUG?.trim() || 'sleepwell')
  console.log('User renames applied (idempotent).')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
