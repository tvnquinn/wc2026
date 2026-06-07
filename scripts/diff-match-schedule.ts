/**
 * Compare matches.csv row count vs DB and report basic drift.
 * Usage: DATABASE_URL=... npx tsx scripts/diff-match-schedule.ts
 */
import { PrismaClient } from '@prisma/client'
import { buildMatchScheduleFromCsv } from '../src/lib/seedMatches'

const prisma = new PrismaClient()

async function main() {
  const fromCsv = buildMatchScheduleFromCsv()

  const dbMatches = await prisma.match.findMany({
    orderBy: { kickoffTime: 'asc' },
    select: { matchNum: true, stage: true, homeTeam: true, awayTeam: true, kickoffTime: true },
  })

  console.log(`CSV rows: ${fromCsv.length}`)
  console.log(`DB rows:  ${dbMatches.length}`)

  if (fromCsv.length !== dbMatches.length) {
    console.log('\nCount mismatch between matches.csv and database.')
  }

  const csvByNum = new Map(fromCsv.map((m) => [m.matchNum, m]))
  let teamMismatches = 0

  for (const db of dbMatches) {
    if (!db.matchNum) continue
    const csv = csvByNum.get(db.matchNum)
    if (!csv) {
      console.log(`Missing in CSV: matchNum ${db.matchNum}`)
      continue
    }
    if (csv.homeTeam !== db.homeTeam || csv.awayTeam !== db.awayTeam) {
      teamMismatches++
      if (teamMismatches <= 5) {
        console.log(
          `Team drift ${db.matchNum}: CSV ${csv.homeTeam} vs ${csv.awayTeam} | DB ${db.homeTeam} vs ${db.awayTeam}`
        )
      }
    }
  }

  if (teamMismatches > 5) {
    console.log(`...and ${teamMismatches - 5} more team mismatches`)
  } else if (teamMismatches === 0 && fromCsv.length === dbMatches.length) {
    console.log('\nSchedule in sync with matches.csv (count and team names).')
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
