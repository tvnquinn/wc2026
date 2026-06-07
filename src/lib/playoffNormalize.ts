import { prisma } from '@/lib/prisma'
import { PLAYOFF_PLACEHOLDER_MAP } from '@/lib/groups'

export async function normalizePlayoffPlaceholderTeamNames() {
  for (const [placeholder, canonical] of Object.entries(PLAYOFF_PLACEHOLDER_MAP)) {
    await prisma.match.updateMany({
      where: { homeTeam: placeholder },
      data: { homeTeam: canonical },
    })
    await prisma.match.updateMany({
      where: { awayTeam: placeholder },
      data: { awayTeam: canonical },
    })
  }
}
