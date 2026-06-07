import { syncAllMatchTeamNames } from '../src/lib/syncMatchTeams'
import { prisma } from '../src/lib/prisma'

async function main() {
  await syncAllMatchTeamNames()
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
