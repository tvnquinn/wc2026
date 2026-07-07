import { prisma } from '@/lib/prisma'
import { getKnockoutBracketUpdates } from '@/lib/bracket'
import { resolvePlayoffPlaceholder } from '@/lib/groups'
import { computePredictionPoints } from '@/lib/scoring'
import { recalculatePointsForMatch } from '@/lib/recalculatePoints'
import { recalculateJackpotForLeague } from '@/lib/recalculateJackpot'

export type FixUserPredictionInput = {
  leagueId: string
  userName: string
  matchNum: number
  homeScore: number
  awayScore: number
}

export type FixUserPredictionResult = {
  matchLabel: string
  previousPick: string
  previousPoints: number
  newPick: string
  newPoints: number
  expectedPoints: number | null
  totalMatchPoints: number
  jackpotWinnings: number
  totalPoints: number
}

export async function fixUserPrediction(
  input: FixUserPredictionInput
): Promise<FixUserPredictionResult> {
  const { leagueId, userName, matchNum, homeScore, awayScore } = input

  const dbUser = await prisma.user.findUnique({
    where: { leagueId_name: { leagueId, name: userName } },
  })
  if (!dbUser) throw new Error(`User not found: ${userName}`)

  const match = await prisma.match.findFirst({ where: { matchNum: String(matchNum) } })
  if (!match) throw new Error(`Match not found: M${matchNum}`)

  const prediction = await prisma.prediction.findUnique({
    where: { userId_matchId: { userId: dbUser.id, matchId: match.id } },
  })

  const previousPick = prediction ? `${prediction.homeScore}-${prediction.awayScore}` : '(none)'
  const previousPoints = prediction?.points ?? 0

  await prisma.prediction.upsert({
    where: { userId_matchId: { userId: dbUser.id, matchId: match.id } },
    create: {
      userId: dbUser.id,
      matchId: match.id,
      homeScore,
      awayScore,
      pkHomeScore: null,
      pkAwayScore: null,
      points: 0,
    },
    update: { homeScore, awayScore, pkHomeScore: null, pkAwayScore: null },
  })

  if (match.isFinished) {
    await recalculatePointsForMatch(match.id, match.stage)
    await recalculateJackpotForLeague(leagueId)
  }

  const updated = await prisma.prediction.findUnique({
    where: { userId_matchId: { userId: dbUser.id, matchId: match.id } },
  })
  const newPoints = updated?.points ?? 0

  const expectedPoints =
    match.isFinished && match.homeScore != null && match.awayScore != null
      ? computePredictionPoints(
          match.stage,
          match.homeScore,
          match.awayScore,
          match.pkHomeScore,
          match.pkAwayScore,
          { homeScore, awayScore, pkHomeScore: null, pkAwayScore: null }
        )
      : null

  const totalMatch = await prisma.prediction.aggregate({
    where: { userId: dbUser.id },
    _sum: { points: true },
  })
  const refreshedUser = await prisma.user.findUnique({ where: { id: dbUser.id } })
  const totalMatchPoints = totalMatch._sum.points ?? 0
  const jackpotWinnings = refreshedUser?.jackpotWinnings ?? 0

  return {
    matchLabel: `M${matchNum} ${match.homeTeam} vs ${match.awayTeam}`,
    previousPick,
    previousPoints,
    newPick: `${homeScore}-${awayScore}`,
    newPoints,
    expectedPoints,
    totalMatchPoints,
    jackpotWinnings,
    totalPoints: totalMatchPoints + jackpotWinnings,
  }
}

export type UpdateMatchTeamsInput = {
  matchNum: number
  homeTeam: string
  awayTeam: string
}

export type UpdateMatchTeamsResult = {
  matchNum: number
  previousLabel: string
  newLabel: string
  bracketUpdates: number
}

async function replayBracketForMatch(matchId: string): Promise<number> {
  const match = await prisma.match.findUnique({ where: { id: matchId } })
  if (!match?.isFinished || match.homeScore == null || match.awayScore == null) return 0

  const bracketUpdates = getKnockoutBracketUpdates({
    id: match.id,
    stage: match.stage,
    homeTeam: resolvePlayoffPlaceholder(match.homeTeam),
    awayTeam: resolvePlayoffPlaceholder(match.awayTeam),
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    pkHomeScore: match.pkHomeScore,
    pkAwayScore: match.pkAwayScore,
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

  return bracketUpdates.length
}

/** Admin correction for wrong knockout team names (scores unchanged). */
export async function updateMatchTeams(
  input: UpdateMatchTeamsInput
): Promise<UpdateMatchTeamsResult> {
  const { matchNum, homeTeam, awayTeam } = input
  const match = await prisma.match.findFirst({ where: { matchNum: String(matchNum) } })
  if (!match) throw new Error(`Match not found: M${matchNum}`)

  const previousLabel = `${match.homeTeam} vs ${match.awayTeam}`
  const trimmedHome = homeTeam.trim()
  const trimmedAway = awayTeam.trim()
  if (!trimmedHome || !trimmedAway) throw new Error('Home and away team names are required')

  await prisma.match.update({
    where: { id: match.id },
    data: { homeTeam: trimmedHome, awayTeam: trimmedAway },
  })

  const bracketUpdates = await replayBracketForMatch(match.id)

  return {
    matchNum,
    previousLabel,
    newLabel: `${trimmedHome} vs ${trimmedAway}`,
    bracketUpdates,
  }
}
