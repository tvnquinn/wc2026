/**
 * Fix stale knockout placeholders (e.g. Czechia in a W73 slot) and sync R32 teams.
 * Usage: DATABASE_URL=... npx tsx scripts/fix-team-names.ts
 */
import { syncAllMatchTeamNames } from '../src/lib/syncMatchTeams'
import { prisma } from '../src/lib/prisma'

async function main() {
  await syncAllMatchTeamNames()

  const match90 = await prisma.match.findFirst({
    where: { matchNum: '90' },
    select: { homeTeam: true, awayTeam: true },
  })
  if (match90) {
    console.log(`Match 90 teams: ${match90.homeTeam} vs ${match90.awayTeam}`)
  }

  const remaining = await prisma.match.count({
    where: {
      OR: [
        { homeTeam: { startsWith: 'UEFA' } },
        { awayTeam: { startsWith: 'UEFA' } },
        { homeTeam: { startsWith: 'FIFA' } },
        { awayTeam: { startsWith: 'FIFA' } },
      ],
    },
  })
  console.log(`Remaining playoff placeholders in matches: ${remaining}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
