import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_SESSION_COOKIE, parseAdminSessionToken } from '@/lib/auth'
import { fixUserPrediction } from '@/lib/adminFixPrediction'
import { getLeagueBySlug } from '@/lib/leagueContext'
import { revalidatePath } from 'next/cache'

type FixBody = {
  leagueSlug: string
  userName: string
  matchNum: number
  homeScore: number
  awayScore: number
}

function revalidateLeague(slug: string) {
  revalidatePath(`/${slug}`)
  revalidatePath(`/${slug}/predict`)
  revalidatePath(`/${slug}/picks`)
  revalidatePath(`/${slug}/admin`)
}

export async function POST(request: Request) {
  let body: FixBody
  try {
    body = (await request.json()) as FixBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { leagueSlug, userName, matchNum, homeScore, awayScore } = body
  if (!leagueSlug || !userName || !matchNum || homeScore == null || awayScore == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const league = await getLeagueBySlug(leagueSlug)
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  const session = token ? parseAdminSessionToken(token) : null
  if (!session || session.leagueId !== league.id) {
    return NextResponse.json({ error: 'Admin login required' }, { status: 401 })
  }

  try {
    const result = await fixUserPrediction({
      leagueId: league.id,
      userName: userName.trim(),
      matchNum: Number(matchNum),
      homeScore: Number(homeScore),
      awayScore: Number(awayScore),
    })
    revalidateLeague(league.slug)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Fix failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
