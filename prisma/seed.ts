import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import crypto from 'crypto'

const prisma = new PrismaClient()

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

  // EDT is UTC-4
  return new Date(`2026-${mm}-${dd}T${hhStr}:${mins}:00-04:00`)
}

async function main() {
  await prisma.prediction.deleteMany()
  await prisma.match.deleteMany()
  await prisma.user.deleteMany()

  const csvText = fs.readFileSync('matches.csv', 'utf8')
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
    if (!stageRaw) continue
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
      const monthDay = parts[1] // "June 11"
      const timePart = dateStr.split('at ')[1] // "3:00 PM"
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

  // Fix known CSV typo: Final home team W191 should be W101
  for (const match of matchDataList) {
    if (match.homeTeam === 'W191') match.homeTeam = 'W101'
  }

  // Bracket linkage for winner-advances (W## pattern)
  for (const match of matchDataList) {
    if (match.homeTeam.startsWith('W') && !isNaN(parseInt(match.homeTeam.substring(1)))) {
       const sourceMatchNum = match.homeTeam.substring(1)
       const source = matchDataList.find(m => m.matchNum === sourceMatchNum)
       if (source) {
         source.nextMatchId = match.id
         source.nextMatchSlot = 'HOME'
       }
    }
    if (match.awayTeam.startsWith('W') && !isNaN(parseInt(match.awayTeam.substring(1)))) {
       const sourceMatchNum = match.awayTeam.substring(1)
       const source = matchDataList.find(m => m.matchNum === sourceMatchNum)
       if (source) {
         source.nextMatchId = match.id
         source.nextMatchSlot = 'AWAY'
       }
    }
  }

  // Bracket linkage for loser-advances (L## pattern — Third Place match)
  for (const match of matchDataList) {
    if (match.homeTeam.startsWith('L') && !isNaN(parseInt(match.homeTeam.substring(1)))) {
       const sourceMatchNum = match.homeTeam.substring(1)
       const source = matchDataList.find(m => m.matchNum === sourceMatchNum)
       if (source) {
         source.loserNextMatchId = match.id
         source.loserNextMatchSlot = 'HOME'
       }
    }
    if (match.awayTeam.startsWith('L') && !isNaN(parseInt(match.awayTeam.substring(1)))) {
       const sourceMatchNum = match.awayTeam.substring(1)
       const source = matchDataList.find(m => m.matchNum === sourceMatchNum)
       if (source) {
         source.loserNextMatchId = match.id
         source.loserNextMatchSlot = 'AWAY'
       }
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

  console.log(`Successfully seeded ${matchDataList.length} matches from Google Sheets CSV!`)

  // Create default family member
  await prisma.user.create({ data: { name: 'coco' } })
  console.log(`Created default user: coco`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
