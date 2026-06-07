import { prisma } from '@/lib/prisma'
import { hashSecret } from '@/lib/auth'
import { GLOBAL_SCORER_SLUG } from '@/lib/league'

const DEFAULT_LEAGUE_ID = '00000000-0000-0000-0000-000000000001'
const PLACEHOLDER_HASH = 'pending-migration-set-on-first-boot'
const LEGACY_HOST_LEAGUE_NAMES = new Set(['Sleepwell Family Pool', 'Official Pool'])

function hostLeagueSlug(): string {
  return process.env.HOST_LEAGUE_SLUG?.trim().toLowerCase() || GLOBAL_SCORER_SLUG
}

function hostLeagueName(): string {
  return process.env.HOST_LEAGUE_NAME?.trim() || 'SleepWell Fam'
}

function hostAdminPassword(): string {
  const fromEnv = process.env.HOST_LEAGUE_ADMIN_PASSWORD?.trim()
  if (fromEnv) return fromEnv
  return 'potty'
}

export async function ensureDefaultLeague() {
  const slug = hostLeagueSlug()
  let league = await prisma.league.findUnique({ where: { slug } })

  const adminHash = hashSecret(hostAdminPassword())

  if (!league) {
    league = await prisma.league.create({
      data: {
        id: DEFAULT_LEAGUE_ID,
        slug,
        name: hostLeagueName(),
        adminPasswordHash: adminHash,
        isPublic: true,
        useGlobalResults: true,
      },
    })
    return league
  }

  const updates: { adminPasswordHash?: string; name?: string } = {}

  if (league.adminPasswordHash === PLACEHOLDER_HASH) {
    updates.adminPasswordHash = adminHash
  }
  if (LEGACY_HOST_LEAGUE_NAMES.has(league.name)) {
    updates.name = hostLeagueName()
  }

  if (Object.keys(updates).length > 0) {
    league = await prisma.league.update({
      where: { id: league.id },
      data: updates,
    })
  }

  return league
}
