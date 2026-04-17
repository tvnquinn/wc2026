'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const POINTS = {
  GROUP: { exact: 3, correctWinner: 1 },
  R32: { exact: 6, correctWinner: 2 },
  R16: { exact: 9, correctWinner: 3 },
  QF: { exact: 12, correctWinner: 4 },
  SF: { exact: 15, correctWinner: 5 },
  THIRD: { exact: 15, correctWinner: 5 },
  FINAL: { exact: 21, correctWinner: 7 },
}

export async function createOrGetUser(name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error("Name cannot be empty")
  let user = await prisma.user.findUnique({ where: { name: trimmed } })
  if (!user) {
    user = await prisma.user.create({ data: { name: trimmed } })
  }
  revalidatePath('/predict')
  return user.id
}

export async function submitAllPredictions(userId: string, predictions: { matchId: string, homeScore: number, awayScore: number }[]) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error("User not found")

  const now = new Date()

  // Process individually to ensure locked matches are protected
  for (const pred of predictions) {
    if (isNaN(pred.homeScore) || isNaN(pred.awayScore)) continue;

    const match = await prisma.match.findUnique({ where: { id: pred.matchId } })
    if (match && now < match.kickoffTime) {
      await prisma.prediction.upsert({
        where: {
          userId_matchId: { userId, matchId: pred.matchId }
        },
        update: { homeScore: pred.homeScore, awayScore: pred.awayScore },
        create: { userId, matchId: pred.matchId, homeScore: pred.homeScore, awayScore: pred.awayScore }
      })
    }
  }
  
  revalidatePath('/predict')
}

export async function setMatchResult(matchId: string, homeScoreStr: string, awayScoreStr: string) {
  const homeScore = parseInt(homeScoreStr, 10)
  const awayScore = parseInt(awayScoreStr, 10)

  if (isNaN(homeScore) || isNaN(awayScore)) {
    throw new Error("Invalid score")
  }

  const match = await prisma.match.update({
    where: { id: matchId },
    data: { homeScore, awayScore, isFinished: true }
  })

  // Bracket Auto-advancement (winner)
  if (match.nextMatchId && match.nextMatchSlot) {
    const actualDiff = homeScore - awayScore;
    const actualWinnerTeam = actualDiff > 0 ? match.homeTeam : match.awayTeam;

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

  // Bracket Auto-advancement (loser → Third Place match)
  if (match.loserNextMatchId && match.loserNextMatchSlot) {
    const actualDiff = homeScore - awayScore;
    const actualLoserTeam = actualDiff > 0 ? match.awayTeam : match.homeTeam;

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

  // @ts-ignore
  const stagePoints = POINTS[match.stage] || { exact: 0, correctWinner: 0 }

  const actualDiff = homeScore - awayScore;
  const actualWinner = actualDiff > 0 ? 'HOME' : actualDiff < 0 ? 'AWAY' : 'DRAW'

  for (const pred of predictions) {
    let earnedPoints = 0
    if (pred.homeScore === homeScore && pred.awayScore === awayScore) {
      earnedPoints = stagePoints.exact
    } else {
      const predDiff = pred.homeScore - pred.awayScore
      const predWinner = predDiff > 0 ? 'HOME' : predDiff < 0 ? 'AWAY' : 'DRAW'
      if (predWinner === actualWinner) {
        earnedPoints = stagePoints.correctWinner
      }
    }

    await prisma.prediction.update({
      where: { id: pred.id },
      data: { points: earnedPoints }
    })
  }
  
  revalidatePath('/')
  revalidatePath('/admin')
  revalidatePath('/predict')
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
    // Clear existing data
    await prisma.prediction.deleteMany()
    await prisma.match.deleteMany()
    await prisma.user.deleteMany()

    const filePath = path.join(process.cwd(), 'matches.csv')
    const csvText = fs.readFileSync(filePath, 'utf8')
    const rows = parseCSV(csvText).slice(1) // skip header

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

    // Fix CSV typos
    for (const m of matchDataList) {
      if (m.homeTeam === 'W191') m.homeTeam = 'W101'
    }

    // Link matches
    for (const match of matchDataList) {
      // Winner links
      if (match.homeTeam.startsWith('W')) {
        const src = matchDataList.find(m => m.matchNum === match.homeTeam.substring(1))
        if (src) { src.nextMatchId = match.id; src.nextMatchSlot = 'HOME'; }
      }
      if (match.awayTeam.startsWith('W')) {
        const src = matchDataList.find(m => m.matchNum === match.awayTeam.substring(1))
        if (src) { src.nextMatchId = match.id; src.nextMatchSlot = 'AWAY'; }
      }
      // Loser links (Third place)
      if (match.homeTeam.startsWith('L')) {
        const src = matchDataList.find(m => m.matchNum === match.homeTeam.substring(1))
        if (src) { src.loserNextMatchId = match.id; src.loserNextMatchSlot = 'HOME'; }
      }
      if (match.awayTeam.startsWith('L')) {
        const src = matchDataList.find(m => m.matchNum === match.awayTeam.substring(1))
        if (src) { src.loserNextMatchId = match.id; src.loserNextMatchSlot = 'AWAY'; }
      }
    }

    // Batch create matches (could use createMany on Postgres, but keeping it simple)
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

    // Create default user
    await prisma.user.create({ data: { name: 'coco' } })

    revalidatePath('/')
    revalidatePath('/admin')
    revalidatePath('/predict')
    return { success: true }
  } catch (error: any) {
    console.error("Seed error:", error)
    return { success: false, error: error.message }
  }
}
