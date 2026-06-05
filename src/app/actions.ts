'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import {
  getPkWinnerSide,
  isKnockoutStage,
  matchWentToPenalties,
  PENALTY_BONUS,
} from '@/lib/penalties'
import {
  SESSION_COOKIE,
  createSessionToken,
  getSessionMaxAgeSeconds,
  hashPin,
  parseSessionToken,
  validatePin,
  verifyPin,
} from '@/lib/auth'

const POINTS: Record<string, { exact: number; correctWinner: number }> = {
  GROUP: { exact: 3, correctWinner: 1 },
  R32: { exact: 6, correctWinner: 2 },
  R16: { exact: 9, correctWinner: 3 },
  QF: { exact: 12, correctWinner: 4 },
  SF: { exact: 15, correctWinner: 5 },
  THIRD: { exact: 15, correctWinner: 5 },
  FINAL: { exact: 21, correctWinner: 7 },
}

type PredictionInput = {
  matchId: string
  homeScore: number
  awayScore: number
  pkHomeScore?: number | null
  pkAwayScore?: number | null
}

function computePredictionPoints(
  stage: string,
  homeScore: number,
  awayScore: number,
  pkHome: number | null,
  pkAway: number | null,
  pred: { homeScore: number; awayScore: number; pkHomeScore: number | null; pkAwayScore: number | null }
): number {
  const stagePoints = POINTS[stage] || { exact: 0, correctWinner: 0 }
  const wentToPk = matchWentToPenalties(stage, homeScore, awayScore, pkHome, pkAway)

  const predDiff = pred.homeScore - pred.awayScore
  const predWinner = predDiff > 0 ? 'HOME' : predDiff < 0 ? 'AWAY' : 'DRAW'
  const actualDiff = homeScore - awayScore
  const actualWinner = actualDiff > 0 ? 'HOME' : actualDiff < 0 ? 'AWAY' : 'DRAW'

  if (wentToPk && predWinner === 'DRAW') {
    if (pred.pkHomeScore == null || pred.pkAwayScore == null) return 0
    const predPkWinner = getPkWinnerSide(pred.pkHomeScore, pred.pkAwayScore)
    const actualPkWinner = getPkWinnerSide(pkHome!, pkAway!)
    if (!predPkWinner || !actualPkWinner || predPkWinner !== actualPkWinner) return 0

    let earned = 0
    if (pred.homeScore === homeScore && pred.awayScore === awayScore) {
      earned = stagePoints.exact
    } else if (predWinner === actualWinner) {
      earned = stagePoints.correctWinner
    }

    if (pred.pkHomeScore === pkHome && pred.pkAwayScore === pkAway) {
      earned += PENALTY_BONUS[stage] || 0
    }
    return earned
  }

  if (pred.homeScore === homeScore && pred.awayScore === awayScore) {
    return stagePoints.exact
  }
  if (predWinner === actualWinner) {
    return stagePoints.correctWinner
  }
  return 0
}

async function setPredictSession(userId: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: getSessionMaxAgeSeconds(),
  })
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return parseSessionToken(token)
}

export async function getPredictSession(): Promise<string | null> {
  return getAuthenticatedUserId()
}

export async function clearPredictSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function createUser(name: string, pin: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Name cannot be empty')
  if (!validatePin(pin)) throw new Error('PIN must be exactly 4 digits')

  const existing = await prisma.user.findUnique({ where: { name: trimmed } })
  if (existing) throw new Error('That name is already taken')

  const user = await prisma.user.create({
    data: {
      name: trimmed,
      passwordHash: hashPin(pin),
    },
  })

  await setPredictSession(user.id)
  revalidatePath('/predict')
  return user.id
}

export async function unlockUser(userId: string, pin: string) {
  if (!validatePin(pin)) throw new Error('PIN must be exactly 4 digits')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')
  if (!user.passwordHash) {
    throw new Error('This profile has no PIN set. Please create a new profile with a PIN.')
  }
  if (!verifyPin(pin, user.passwordHash)) throw new Error('Incorrect PIN')

  await setPredictSession(user.id)
  return { success: true as const }
}

export async function submitAllPredictions(predictions: PredictionInput[]) {
  const userId = await getAuthenticatedUserId()
  if (!userId) throw new Error('Enter your PIN to unlock again')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  const now = new Date()

  for (const pred of predictions) {
    if (isNaN(pred.homeScore) || isNaN(pred.awayScore)) continue

    const match = await prisma.match.findUnique({ where: { id: pred.matchId } })
    if (!match || match.isFinished || now >= match.kickoffTime) continue

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
      where: {
        userId_matchId: { userId, matchId: pred.matchId }
      },
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
      }
    })
  }

  revalidatePath('/predict')
  revalidatePath('/picks')
}

export async function setMatchResult(
  matchId: string,
  homeScoreStr: string,
  awayScoreStr: string,
  pkHomeScoreStr?: string,
  pkAwayScoreStr?: string
) {
  const homeScore = parseInt(homeScoreStr, 10)
  const awayScore = parseInt(awayScoreStr, 10)

  if (isNaN(homeScore) || isNaN(awayScore)) {
    throw new Error("Invalid score")
  }

  const existing = await prisma.match.findUnique({ where: { id: matchId } })
  if (!existing) throw new Error("Match not found")

  let pkHomeScore: number | null = null
  let pkAwayScore: number | null = null

  const knockoutTie = isKnockoutStage(existing.stage) && homeScore === awayScore

  if (knockoutTie) {
    if (!pkHomeScoreStr || !pkAwayScoreStr) {
      throw new Error("Knockout draw requires penalty shootout scores")
    }
    pkHomeScore = parseInt(pkHomeScoreStr, 10)
    pkAwayScore = parseInt(pkAwayScoreStr, 10)
    if (isNaN(pkHomeScore) || isNaN(pkAwayScore)) {
      throw new Error("Invalid penalty score")
    }
    if (pkHomeScore === pkAwayScore) {
      throw new Error("Penalty shootout cannot be tied")
    }
  }

  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore,
      awayScore,
      pkHomeScore: knockoutTie ? pkHomeScore : null,
      pkAwayScore: knockoutTie ? pkAwayScore : null,
      isFinished: true,
    }
  })

  let actualWinnerTeam: string | null = null
  let actualLoserTeam: string | null = null

  if (homeScore !== awayScore) {
    actualWinnerTeam = homeScore > awayScore ? match.homeTeam : match.awayTeam
    actualLoserTeam = homeScore > awayScore ? match.awayTeam : match.homeTeam
  } else if (knockoutTie && pkHomeScore != null && pkAwayScore != null) {
    actualWinnerTeam = pkHomeScore > pkAwayScore ? match.homeTeam : match.awayTeam
    actualLoserTeam = pkHomeScore > pkAwayScore ? match.awayTeam : match.homeTeam
  }

  if (actualWinnerTeam && match.nextMatchId && match.nextMatchSlot) {
    if (match.nextMatchSlot === 'HOME') {
      await prisma.match.update({
        where: { id: match.nextMatchId },
        data: { homeTeam: actualWinnerTeam }
      })
    } else {
      await prisma.match.update({
        where: { id: match.nextMatchId },
        data: { awayTeam: actualWinnerTeam }
      })
    }
  }

  if (actualLoserTeam && match.loserNextMatchId && match.loserNextMatchSlot) {
    if (match.loserNextMatchSlot === 'HOME') {
      await prisma.match.update({
        where: { id: match.loserNextMatchId },
        data: { homeTeam: actualLoserTeam }
      })
    } else {
      await prisma.match.update({
        where: { id: match.loserNextMatchId },
        data: { awayTeam: actualLoserTeam }
      })
    }
  }

  const predictions = await prisma.prediction.findMany({
    where: { matchId: matchId }
  })

  for (const pred of predictions) {
    const earnedPoints = computePredictionPoints(
      match.stage,
      homeScore,
      awayScore,
      pkHomeScore,
      pkAwayScore,
      pred
    )

    await prisma.prediction.update({
      where: { id: pred.id },
      data: { points: earnedPoints }
    })
  }

  revalidatePath('/')
  revalidatePath('/admin')
  revalidatePath('/predict')
  revalidatePath('/picks')
}

// Database Initialization (Seed) Action
function parseCSV(text: string) {
  const result = []
  let row = []
  let currentStr = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      inQuotes = !inQuotes
    } else if (c === ',' && !inQuotes) {
      row.push(currentStr)
      currentStr = ""
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (c === '\r') continue
      row.push(currentStr)
      result.push(row)
      row = []
      currentStr = ""
    } else {
      currentStr += c
    }
  }
  if (currentStr) row.push(currentStr)
  if (row.length > 0) result.push(row)
  return result
}

function parseDateStrings(monthDay: string, time: string) {
  const months: Record<string, string> = { "June": "06", "July": "07" }
  const [monStr, dayStr] = monthDay.trim().split(' ')
  const mm = months[monStr] || "06"
  const dd = dayStr.padStart(2, '0')

  let [hhmm, ampm] = time.trim().split(' ')
  let [hh, mins] = hhmm.split(':')
  let hInt = parseInt(hh)
  if (ampm === 'PM' && hInt < 12) hInt += 12
  if (ampm === 'AM' && hInt === 12) hInt = 0
  const hhStr = hInt.toString().padStart(2, '0')

  return new Date(`2026-${mm}-${dd}T${hhStr}:${mins}:00-04:00`)
}

export async function seedDatabase() {
  try {
    await prisma.prediction.deleteMany()
    await prisma.match.deleteMany()
    await prisma.user.deleteMany()

    const filePath = path.join(process.cwd(), 'matches.csv')
    const csvText = fs.readFileSync(filePath, 'utf8')
    const rows = parseCSV(csvText).slice(1)

    const matchDataList: any[] = []
    const matchIdMap = new Map()

    for (const row of rows) {
      if (row.length < 5) continue
      const matchNum = row[4].trim()
      if (!matchNum) continue
      matchIdMap.set(matchNum, crypto.randomUUID())
    }

    for (const row of rows) {
      if (row.length < 5) continue
      const stageRaw = row[0].trim()
      const dateStr = row[1].trim()
      const team1 = row[2].trim()
      const team2 = row[3].trim()
      const matchNum = row[4].trim()

      let stage = 'GROUP'
      if (stageRaw.includes('Round of 32')) stage = 'R32'
      else if (stageRaw.includes('Round of 16')) stage = 'R16'
      else if (stageRaw.includes('Quarterfinal')) stage = 'QF'
      else if (stageRaw.includes('Semifinal')) stage = 'SF'
      else if (stageRaw.toLowerCase().includes('third')) stage = 'THIRD'
      else if (stageRaw === 'Final') stage = 'FINAL'

      const parts = dateStr.split(', ')
      let dateObj = new Date()
      if (parts.length >= 2) {
        const monthDay = parts[1]
        const timePart = dateStr.split('at ')[1]
        dateObj = parseDateStrings(monthDay, timePart)
      }

      matchDataList.push({
        id: matchIdMap.get(matchNum),
        stage,
        matchNum,
        homeTeam: team1,
        awayTeam: team2,
        kickoffTime: dateObj,
        nextMatchId: null,
        nextMatchSlot: null
      })
    }

    for (const m of matchDataList) {
      if (m.homeTeam === 'W191') m.homeTeam = 'W101'
    }

    for (const match of matchDataList) {
      if (match.homeTeam.startsWith('W')) {
        const src = matchDataList.find(m => m.matchNum === match.homeTeam.substring(1))
        if (src) { src.nextMatchId = match.id; src.nextMatchSlot = 'HOME'; }
      }
      if (match.awayTeam.startsWith('W')) {
        const src = matchDataList.find(m => m.matchNum === match.awayTeam.substring(1))
        if (src) { src.nextMatchId = match.id; src.nextMatchSlot = 'AWAY'; }
      }
      if (match.homeTeam.startsWith('L')) {
        const src = matchDataList.find(m => m.matchNum === match.homeTeam.substring(1))
        if (src) { src.loserNextMatchId = match.id; src.loserNextMatchSlot = 'HOME'; }
      }
      if (match.awayTeam.startsWith('L')) {
        const src = matchDataList.find(m => m.matchNum === match.awayTeam.substring(1))
        if (src) { src.loserNextMatchId = match.id; src.loserNextMatchSlot = 'AWAY'; }
      }
    }

    for (const match of matchDataList) {
      await prisma.match.create({
        data: {
          id: match.id,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          kickoffTime: match.kickoffTime,
          stage: match.stage,
          nextMatchId: match.nextMatchId,
          nextMatchSlot: match.nextMatchSlot,
          loserNextMatchId: match.loserNextMatchId || null,
          loserNextMatchSlot: match.loserNextMatchSlot || null
        }
      })
    }

    revalidatePath('/')
    revalidatePath('/admin')
    revalidatePath('/predict')
    revalidatePath('/picks')
    return { success: true }
  } catch (error: any) {
    console.error("Seed error:", error)
    return { success: false, error: error.message }
  }
}
