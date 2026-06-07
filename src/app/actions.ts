'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isKnockoutStage } from '@/lib/penalties'
import { getKnockoutBracketUpdates } from '@/lib/bracket'
import { updateR32TeamsFromGroupStage } from '@/lib/r32Update'
import {
  SESSION_COOKIE,
  ADMIN_SESSION_COOKIE,
  createSessionToken,
  createAdminSessionToken,
  getSessionMaxAgeSeconds,
  hashPin,
  hashSecret,
  parseSessionToken,
  parseAdminSessionToken,
  validatePin,
  verifyPin,
  verifySecret,
} from '@/lib/auth'
import { isScoredForLeague } from '@/lib/effectiveResults'
import {
  isGlobalScorerLeague,
  requireGlobalScorerLeague,
  validateAdminPassword,
  validateLeagueName,
  validateSlug,
  validateUserName,
} from '@/lib/league'
import { getLeagueBySlug } from '@/lib/leagueContext'
import { recalculatePointsForMatch } from '@/lib/recalculatePoints'
import { seedGlobalMatches } from '@/lib/seedMatches'

type PredictionInput = {
  matchId: string
  homeScore: number
  awayScore: number
  pkHomeScore?: number | null
  pkAwayScore?: number | null
}

function revalidateLeague(slug: string) {
  revalidatePath(`/${slug}`)
  revalidatePath(`/${slug}/predict`)
  revalidatePath(`/${slug}/picks`)
  revalidatePath(`/${slug}/admin`)
}

async function setPredictSession(userId: string, leagueId: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, createSessionToken(userId, leagueId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: getSessionMaxAgeSeconds(),
  })
}

async function getAuthenticatedSession(leagueId: string): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  const session = parseSessionToken(token)
  if (!session || session.leagueId !== leagueId) return null
  return session.userId
}

async function requireAdminSession(leagueId: string) {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  if (!token) throw new Error('Admin login required')
  const session = parseAdminSessionToken(token)
  if (!session || session.leagueId !== leagueId) throw new Error('Admin login required')
}

export async function getPredictSession(leagueSlug: string): Promise<string | null> {
  const league = await getLeagueBySlug(leagueSlug)
  return getAuthenticatedSession(league.id)
}

export async function clearPredictSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function createUser(leagueSlug: string, name: string, pin: string) {
  const league = await getLeagueBySlug(leagueSlug)
  const nameError = validateUserName(name)
  if (nameError) throw new Error(nameError)
  const trimmed = name.trim()
  if (!validatePin(pin)) throw new Error('PIN must be exactly 4 digits')

  const existing = await prisma.user.findUnique({
    where: { leagueId_name: { leagueId: league.id, name: trimmed } },
  })
  if (existing) throw new Error('That name is already taken')

  const user = await prisma.user.create({
    data: {
      leagueId: league.id,
      name: trimmed,
      passwordHash: hashPin(pin),
    },
  })

  await setPredictSession(user.id, league.id)
  revalidateLeague(league.slug)
  return user.id
}

export async function unlockUser(leagueSlug: string, userId: string, pin: string) {
  const league = await getLeagueBySlug(leagueSlug)
  if (!validatePin(pin)) throw new Error('PIN must be exactly 4 digits')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.leagueId !== league.id) throw new Error('User not found')
  if (!user.passwordHash) {
    throw new Error('This profile has no PIN set. Please create a new profile with a PIN.')
  }
  if (!verifyPin(pin, user.passwordHash)) throw new Error('Incorrect PIN')

  await setPredictSession(user.id, league.id)
  return { success: true as const }
}

export async function submitAllPredictions(leagueSlug: string, predictions: PredictionInput[]) {
  const league = await getLeagueBySlug(leagueSlug)
  const userId = await getAuthenticatedSession(league.id)
  if (!userId) throw new Error('Enter your PIN to unlock again')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.leagueId !== league.id) throw new Error('User not found')

  const now = new Date()
  const matchIds = predictions.map((p) => p.matchId)
  const [matches, overrides] = await Promise.all([
    prisma.match.findMany({ where: { id: { in: matchIds } } }),
    prisma.leagueResultOverride.findMany({
      where: { leagueId: league.id, matchId: { in: matchIds } },
    }),
  ])
  const matchById = new Map(matches.map((m) => [m.id, m]))
  const overrideByMatchId = new Map(overrides.map((o) => [o.matchId, o]))

  for (const pred of predictions) {
    if (isNaN(pred.homeScore) || isNaN(pred.awayScore)) continue

    const match = matchById.get(pred.matchId)
    if (!match || now >= match.kickoffTime) continue

    const override = overrideByMatchId.get(pred.matchId)
    if (
      isScoredForLeague({
        global: {
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          pkHomeScore: match.pkHomeScore,
          pkAwayScore: match.pkAwayScore,
          isFinished: match.isFinished,
        },
        override: override
          ? {
              homeScore: override.homeScore,
              awayScore: override.awayScore,
              pkHomeScore: override.pkHomeScore,
              pkAwayScore: override.pkAwayScore,
              isFinished: override.isFinished,
            }
          : null,
      })
    ) {
      continue
    }

    const isDraw = pred.homeScore === pred.awayScore
    const knockoutDraw = isKnockoutStage(match.stage) && isDraw

    let pkHomeScore: number | null = null
    let pkAwayScore: number | null = null

    if (knockoutDraw && pred.pkHomeScore != null && pred.pkAwayScore != null) {
      if (pred.pkHomeScore === pred.pkAwayScore) {
        throw new Error(`Invalid PK score for ${match.homeTeam} vs ${match.awayTeam}: PK cannot be tied`)
      }
      pkHomeScore = pred.pkHomeScore
      pkAwayScore = pred.pkAwayScore
    }

    await prisma.prediction.upsert({
      where: { userId_matchId: { userId, matchId: pred.matchId } },
      update: {
        homeScore: pred.homeScore,
        awayScore: pred.awayScore,
        pkHomeScore,
        pkAwayScore,
      },
      create: {
        userId,
        matchId: pred.matchId,
        homeScore: pred.homeScore,
        awayScore: pred.awayScore,
        pkHomeScore,
        pkAwayScore,
      },
    })
  }

  revalidateLeague(league.slug)
}

export async function loginLeagueAdmin(leagueSlug: string, password: string) {
  const league = await getLeagueBySlug(leagueSlug)
  if (!verifySecret(password, league.adminPasswordHash)) {
    throw new Error('Incorrect admin password')
  }

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(league.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: getSessionMaxAgeSeconds(),
  })

  return { success: true as const }
}

export async function logoutLeagueAdmin() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_SESSION_COOKIE)
}

export async function getAdminSessionLeagueId(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  if (!token) return null
  return parseAdminSessionToken(token)?.leagueId ?? null
}

export async function setMatchResult(
  leagueSlug: string,
  matchId: string,
  homeScoreStr: string,
  awayScoreStr: string,
  pkHomeScoreStr?: string,
  pkAwayScoreStr?: string
) {
  const league = await getLeagueBySlug(leagueSlug)
  await requireAdminSession(league.id)

  const homeScore = parseInt(homeScoreStr, 10)
  const awayScore = parseInt(awayScoreStr, 10)
  if (isNaN(homeScore) || isNaN(awayScore)) throw new Error('Invalid score')

  const existing = await prisma.match.findUnique({ where: { id: matchId } })
  if (!existing) throw new Error('Match not found')

  let pkHomeScore: number | null = null
  let pkAwayScore: number | null = null
  const knockoutTie = isKnockoutStage(existing.stage) && homeScore === awayScore

  if (knockoutTie) {
    if (!pkHomeScoreStr || !pkAwayScoreStr) {
      throw new Error('Knockout draw requires penalty shootout scores')
    }
    pkHomeScore = parseInt(pkHomeScoreStr, 10)
    pkAwayScore = parseInt(pkAwayScoreStr, 10)
    if (isNaN(pkHomeScore) || isNaN(pkAwayScore)) throw new Error('Invalid penalty score')
    if (pkHomeScore === pkAwayScore) throw new Error('Penalty shootout cannot be tied')
  }

  if (isGlobalScorerLeague(league.slug)) {
    const match = await prisma.match.update({
      where: { id: matchId },
      data: {
        homeScore,
        awayScore,
        pkHomeScore: knockoutTie ? pkHomeScore : null,
        pkAwayScore: knockoutTie ? pkAwayScore : null,
        isFinished: true,
      },
    })

    const bracketUpdates = getKnockoutBracketUpdates({
      id: match.id,
      stage: match.stage,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore,
      awayScore,
      pkHomeScore: knockoutTie ? pkHomeScore : null,
      pkAwayScore: knockoutTie ? pkAwayScore : null,
      nextMatchId: match.nextMatchId,
      nextMatchSlot: match.nextMatchSlot,
      loserNextMatchId: match.loserNextMatchId,
      loserNextMatchSlot: match.loserNextMatchSlot,
    })

    for (const update of bracketUpdates) {
      await prisma.match.update({
        where: { id: update.matchId },
        data: update.slot === 'HOME' ? { homeTeam: update.team } : { awayTeam: update.team },
      })
    }

    if (match.stage === 'GROUP') {
      await updateR32TeamsFromGroupStage()
    }

    await recalculatePointsForMatch(matchId, match.stage)
  } else {
    await prisma.leagueResultOverride.upsert({
      where: { leagueId_matchId: { leagueId: league.id, matchId } },
      update: {
        homeScore,
        awayScore,
        pkHomeScore: knockoutTie ? pkHomeScore : null,
        pkAwayScore: knockoutTie ? pkAwayScore : null,
        isFinished: true,
      },
      create: {
        leagueId: league.id,
        matchId,
        homeScore,
        awayScore,
        pkHomeScore: knockoutTie ? pkHomeScore : null,
        pkAwayScore: knockoutTie ? pkAwayScore : null,
        isFinished: true,
      },
    })

    await recalculatePointsForMatch(matchId, existing.stage)
  }

  const allLeagues = await prisma.league.findMany({ select: { slug: true } })
  for (const l of allLeagues) {
    revalidateLeague(l.slug)
  }
  revalidatePath('/')
}

export async function createLeague(
  slug: string,
  name: string,
  adminPassword: string
) {
  const normalizedSlug = slug.trim().toLowerCase()
  const slugError = validateSlug(normalizedSlug)
  if (slugError) throw new Error(slugError)
  const nameError = validateLeagueName(name)
  if (nameError) throw new Error(nameError)
  const passwordError = validateAdminPassword(adminPassword)
  if (passwordError) throw new Error(passwordError)

  const existing = await prisma.league.findUnique({ where: { slug: normalizedSlug } })
  if (existing) throw new Error('That slug is already taken')

  await seedGlobalMatches()

  await prisma.league.create({
    data: {
      slug: normalizedSlug,
      name: name.trim(),
      description: null,
      adminPasswordHash: hashSecret(adminPassword),
      isPublic: true,
      useGlobalResults: false,
    },
  })

  revalidatePath('/')
  redirect(`/${normalizedSlug}`)
}

export async function resetLeague(leagueSlug: string) {
  const league = await getLeagueBySlug(leagueSlug)
  await requireAdminSession(league.id)

  await prisma.prediction.deleteMany({
    where: { user: { leagueId: league.id } },
  })
  await prisma.user.deleteMany({ where: { leagueId: league.id } })
  await prisma.leagueResultOverride.deleteMany({ where: { leagueId: league.id } })

  revalidateLeague(league.slug)
  return { success: true as const }
}

export async function clearAllMatchResults(leagueSlug: string) {
  const league = await getLeagueBySlug(leagueSlug)
  await requireAdminSession(league.id)
  requireGlobalScorerLeague(league.slug)

  await prisma.$transaction([
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

  const allLeagues = await prisma.league.findMany({ select: { slug: true } })
  for (const l of allLeagues) {
    revalidateLeague(l.slug)
  }
  revalidatePath('/')

  return { success: true as const }
}

export async function seedDatabase(leagueSlug: string) {
  const league = await getLeagueBySlug(leagueSlug)
  await requireAdminSession(league.id)
  requireGlobalScorerLeague(league.slug)

  try {
    const result = await seedGlobalMatches()
    revalidatePath('/')
    revalidateLeague(league.slug)
    return { success: true as const, skipped: result.skipped }
  } catch (error: unknown) {
    console.error('Seed error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false as const, error: message }
  }
}
