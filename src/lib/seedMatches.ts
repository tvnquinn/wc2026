import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { resolvePlayoffPlaceholder } from '@/lib/groups'

export type ScheduleRow = {
  id: string
  stage: string
  matchNum: string
  homeTeam: string
  awayTeam: string
  kickoffTime: Date
  nextMatchId: string | null
  nextMatchSlot: string | null
  loserNextMatchId: string | null
  loserNextMatchSlot: string | null
}

function parseCSV(text: string) {
  const result: string[][] = []
  let row: string[] = []
  let currentStr = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      inQuotes = !inQuotes
    } else if (c === ',' && !inQuotes) {
      row.push(currentStr)
      currentStr = ''
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (c === '\r') continue
      row.push(currentStr)
      result.push(row)
      row = []
      currentStr = ''
    } else {
      currentStr += c
    }
  }
  if (currentStr) row.push(currentStr)
  if (row.length > 0) result.push(row)
  return result
}

function parseDateStrings(monthDay: string, time: string) {
  const months: Record<string, string> = { June: '06', July: '07' }
  const [monStr, dayStr] = monthDay.trim().split(' ')
  const mm = months[monStr] || '06'
  const dd = dayStr.padStart(2, '0')

  const [hhmm, ampm] = time.trim().split(' ')
  const [hh, mins] = hhmm.split(':')
  let hInt = parseInt(hh, 10)
  if (ampm === 'PM' && hInt < 12) hInt += 12
  if (ampm === 'AM' && hInt === 12) hInt = 0
  const hhStr = hInt.toString().padStart(2, '0')

  return new Date(`2026-${mm}-${dd}T${hhStr}:${mins}:00-04:00`)
}

export function buildMatchScheduleFromCsv(): ScheduleRow[] {
  const filePath = path.join(process.cwd(), 'matches.csv')
  const csvText = fs.readFileSync(filePath, 'utf8')
  const rows = parseCSV(csvText).slice(1)

  const matchDataList: ScheduleRow[] = []
  const matchIdMap = new Map<string, string>()

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
      id: matchIdMap.get(matchNum)!,
      stage,
      matchNum,
      homeTeam: resolvePlayoffPlaceholder(team1),
      awayTeam: resolvePlayoffPlaceholder(team2),
      kickoffTime: dateObj,
      nextMatchId: null,
      nextMatchSlot: null,
      loserNextMatchId: null,
      loserNextMatchSlot: null,
    })
  }

  for (const m of matchDataList) {
    if (m.homeTeam === 'W191') m.homeTeam = 'W101'
  }

  for (const match of matchDataList) {
    if (match.homeTeam.startsWith('W')) {
      const src = matchDataList.find((m) => m.matchNum === match.homeTeam.substring(1))
      if (src) {
        src.nextMatchId = match.id
        src.nextMatchSlot = 'HOME'
      }
    }
    if (match.awayTeam.startsWith('W')) {
      const src = matchDataList.find((m) => m.matchNum === match.awayTeam.substring(1))
      if (src) {
        src.nextMatchId = match.id
        src.nextMatchSlot = 'AWAY'
      }
    }
    if (match.homeTeam.startsWith('L')) {
      const src = matchDataList.find((m) => m.matchNum === match.homeTeam.substring(1))
      if (src) {
        src.loserNextMatchId = match.id
        src.loserNextMatchSlot = 'HOME'
      }
    }
    if (match.awayTeam.startsWith('L')) {
      const src = matchDataList.find((m) => m.matchNum === match.awayTeam.substring(1))
      if (src) {
        src.loserNextMatchId = match.id
        src.loserNextMatchSlot = 'AWAY'
      }
    }
  }

  return matchDataList.sort((a, b) => a.kickoffTime.getTime() - b.kickoffTime.getTime())
}

/** Reset all match rows to canonical CSV teams/bracket links (preserves DB ids). */
export async function restoreGlobalScheduleFromCsv() {
  const schedule = buildMatchScheduleFromCsv()
  const dbMatches = await prisma.match.findMany({ orderBy: { kickoffTime: 'asc' } })

  if (dbMatches.length !== schedule.length) {
    throw new Error(`Expected ${schedule.length} matches in DB, found ${dbMatches.length}`)
  }

  const csvIdToDbId = new Map<string, string>()
  for (let i = 0; i < schedule.length; i++) {
    csvIdToDbId.set(schedule[i].id, dbMatches[i].id)
  }

  const resolveDbId = (csvId: string | null) =>
    csvId ? (csvIdToDbId.get(csvId) ?? null) : null

  for (let i = 0; i < schedule.length; i++) {
    const row = schedule[i]
    const dbId = dbMatches[i].id

    await prisma.match.update({
      where: { id: dbId },
      data: {
        matchNum: row.matchNum,
        stage: row.stage,
        homeTeam: row.homeTeam,
        awayTeam: row.awayTeam,
        kickoffTime: row.kickoffTime,
        homeScore: null,
        awayScore: null,
        pkHomeScore: null,
        pkAwayScore: null,
        isFinished: false,
        nextMatchId: resolveDbId(row.nextMatchId),
        nextMatchSlot: row.nextMatchSlot,
        loserNextMatchId: resolveDbId(row.loserNextMatchId),
        loserNextMatchSlot: row.loserNextMatchSlot,
      },
    })
  }
}

export async function seedGlobalMatches() {
  const existing = await prisma.match.count()
  if (existing > 0) {
    return { success: true as const, skipped: true as const }
  }

  const matchDataList = buildMatchScheduleFromCsv()

  for (const match of matchDataList) {
    await prisma.match.create({
      data: {
        id: match.id,
        matchNum: match.matchNum,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        kickoffTime: match.kickoffTime,
        stage: match.stage,
        nextMatchId: match.nextMatchId,
        nextMatchSlot: match.nextMatchSlot,
        loserNextMatchId: match.loserNextMatchId,
        loserNextMatchSlot: match.loserNextMatchSlot,
      },
    })
  }

  return { success: true as const, skipped: false as const }
}
