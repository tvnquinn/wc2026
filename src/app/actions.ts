'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isKnockoutStage } from '@/lib/penalties'
import { getKnockoutBracketUpdates } from '@/lib/bracket'
import { restoreGlobalScheduleFromCsv } from '@/lib/seedMatches'
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
import {
  recalculateJackpotForAllLeagues,
  recalculateJackpotForLeague,
} from '@/lib/recalculateJackpot'
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

export type MatchResultInput = {
  matchId: string
  homeScoreStr: string
  awayScoreStr: string
  pkHomeScoreStr?: string
  pkAwayScoreStr?: string
}

type ParsedMatchResult = {
  homeScore: number
  awayScore: number
  pkHomeScore: number | null
  pkAwayScore: number | null
  knockoutTie: boolean
}

function parseMatchResultInput(
  existing: { stage: string },
  input: MatchResultInput
): ParsedMatchResult {
  const homeScore = parseInt(input.homeScoreStr, 10)
  const awayScore = parseInt(input.awayScoreStr, 10)
  if (isNaN(homeScore) || isNaN(awayScore)) throw new Error('Invalid score')

  const knockoutTie = isKnockoutStage(existing.stage) && homeScore === awayScore
  let pkHomeScore: number | null = null
  let pkAwayScore: number | null = null

  if (knockoutTie) {
    if (!input.pkHomeScoreStr || !input.pkAwayScoreStr) {
      throw new Error('Knockout draw requires penalty shootout scores')
    }
    pkHomeScore = parseInt(input.pkHomeScoreStr, 10)
    pkAwayScore = parseInt(input.pkAwayScoreStr, 10)
    if (isNaN(pkHomeScore) || isNaN(pkAwayScore)) throw new Error('Invalid penalty score')
    if (pkHomeScore === pkAwayScore) throw new Error('Penalty shootout cannot be tied')
  }

  return { homeScore, awayScore, pkHomeScore, pkAwayScore, knockoutTie }
}

function isSameStoredResult(
  stored: {
    homeScore: number | null
    awayScore: number | null
    pkHomeScore: number | null
    pkAwayScore: number | null
    isFinished: boolean
  },
  parsed: ParsedMatchResult
): boolean {
  return (
    stored.isFinished &&
    stored.homeScore === parsed.homeScore &&
    stored.awayScore === parsed.awayScore &&
    stored.pkHomeScore === (parsed.knockoutTie ? parsed.pkHomeScore : null) &&
    stored.pkAwayScore === (parsed.knockoutTie ? parsed.pkAwayScore : null)
  )
}

async function applyMatchResult(
  league: { id: string; slug: string },
  existing: {
    id: string
    stage: string
    homeTeam: string
    awayTeam: string
    homeScore: number | null
    awayScore: number | null
    pkHomeScore: number | null
    pkAwayScore: number | null
    isFinished: boolean
    nextMatchId: string | null
    nextMatchSlot: string | null
    loserNextMatchId: string | null
    loserNextMatchSlot: string | null
  },
  parsed: ParsedMatchResult,
  options: { skipUnchanged?: boolean; override?: { homeScore: number | null; awayScore: number | null; pkHomeScore: number | null; pkAwayScore: number | null; isFinished: boolean } | null } = {}
): Promise<{ applied: boolean; isGroupStage: boolean }> {
  if (isGlobalScorerLeague(league.slug)) {
    if (options.skipUnchanged && isSameStoredResult(existing, parsed)) {
      return { applied: false, isGroupStage: false }
    }

    const match = await prisma.match.update({
      where: { id: existing.id },
      data: {
        homeScore: parsed.homeScore,
        awayScore: parsed.awayScore,
        pkHomeScore: parsed.knockoutTie ? parsed.pkHomeScore : null,
        pkAwayScore: parsed.knockoutTie ? parsed.pkAwayScore : null,
        isFinished: true,
      },
    })

    const bracketUpdates = getKnockoutBracketUpdates({
      id: match.id,
      stage: match.stage,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: parsed.homeScore,
      awayScore: parsed.awayScore,
      pkHomeScore: parsed.knockoutTie ? parsed.pkHomeScore : null,
      pkAwayScore: parsed.knockoutTie ? parsed.pkAwayScore : null,
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

    await recalculatePointsForMatch(existing.id, match.stage)
    return { applied: true, isGroupStage: match.stage === 'GROUP' }
  }

  const stored = options.override ?? {
    homeScore: null,
    awayScore: null,
    pkHomeScore: null,
    pkAwayScore: null,
    isFinished: false,
  }

  if (options.skipUnchanged && isSameStoredResult(stored, parsed)) {
    return { applied: false, isGroupStage: false }
  }

  await prisma.leagueResultOverride.upsert({
    where: { leagueId_matchId: { leagueId: league.id, matchId: existing.id } },
    update: {
      homeScore: parsed.homeScore,
      awayScore: parsed.awayScore,
      pkHomeScore: parsed.knockoutTie ? parsed.pkHomeScore : null,
      pkAwayScore: parsed.knockoutTie ? parsed.pkAwayScore : null,
      isFinished: true,
    },
    create: {
      leagueId: league.id,
      matchId: existing.id,
      homeScore: parsed.homeScore,
      awayScore: parsed.awayScore,
      pkHomeScore: parsed.knockoutTie ? parsed.pkHomeScore : null,
      pkAwayScore: parsed.knockoutTie ? parsed.pkAwayScore : null,
      isFinished: true,
    },
  })

  await recalculatePointsForMatch(existing.id, existing.stage)
  return { applied: true, isGroupStage: false }
}

async function revalidateAllLeagues() {
  const allLeagues = await prisma.league.findMany({ select: { slug: true } })
  for (const l of allLeagues) {
    revalidateLeague(l.slug)
  }
  revalidatePath('/')
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

  const existing = await prisma.match.findUnique({ where: { id: matchId } })
  if (!existing) throw new Error('Match not found')

  const parsed = parseMatchResultInput(existing, {
    matchId,
    homeScoreStr,
    awayScoreStr,
    pkHomeScoreStr,
    pkAwayScoreStr,
  })

  const override = isGlobalScorerLeague(league.slug)
    ? null
    : await prisma.leagueResultOverride.findUnique({
        where: { leagueId_matchId: { leagueId: league.id, matchId } },
      })

  const { applied, isGroupStage } = await applyMatchResult(league, existing, parsed, {
    skipUnchanged: true,
    override,
  })

  if (!applied) return

  if (isGroupStage) {
    await updateR32TeamsFromGroupStage()
  }

  if (isGlobalScorerLeague(league.slug)) {
    await recalculateJackpotForAllLeagues()
  } else {
    await recalculateJackpotForLeague(league.id)
  }

  await revalidateAllLeagues()
}

export async function setMatchResultsBatch(
  leagueSlug: string,
  inputs: MatchResultInput[]
): Promise<{ appliedCount: number }> {
  const league = await getLeagueBySlug(leagueSlug)
  await requireAdminSession(league.id)

  const matchIds = inputs.map((input) => input.matchId)
  const [matches, overrides] = await Promise.all([
    prisma.match.findMany({ where: { id: { in: matchIds } } }),
    isGlobalScorerLeague(league.slug)
      ? Promise.resolve([])
      : prisma.leagueResultOverride.findMany({
          where: { leagueId: league.id, matchId: { in: matchIds } },
        }),
  ])

  const matchById = new Map(matches.map((match) => [match.id, match]))
  const overrideByMatchId = new Map(overrides.map((override) => [override.matchId, override]))

  let appliedCount = 0
  let groupStageTouched = false

  for (const input of inputs) {
    const existing = matchById.get(input.matchId)
    if (!existing) continue
    if (input.homeScoreStr === '' || input.awayScoreStr === '') continue

    const parsed = parseMatchResultInput(existing, input)
    const { applied, isGroupStage } = await applyMatchResult(league, existing, parsed, {
      skipUnchanged: true,
      override: overrideByMatchId.get(input.matchId) ?? null,
    })

    if (applied) {
      appliedCount++
      if (isGroupStage) groupStageTouched = true
    }
  }

  if (appliedCount === 0) return { appliedCount: 0 }

  if (groupStageTouched) {
    await updateR32TeamsFromGroupStage()
  }

  if (isGlobalScorerLeague(league.slug)) {
    await recalculateJackpotForAllLeagues()
  } else {
    await recalculateJackpotForLeague(league.id)
  }

  await revalidateAllLeagues()
  return { appliedCount }
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
    prisma.leagueResultOverride.deleteMany(),
    prisma.prediction.updateMany({ data: { points: 0 } }),
  ])

  await restoreGlobalScheduleFromCsv()

  const allLeagues = await prisma.league.findMany({ select: { slug: true } })
  for (const l of allLeagues) {
    revalidateLeague(l.slug)
  }
  revalidatePath('/')

  return { success: true as const }
}

