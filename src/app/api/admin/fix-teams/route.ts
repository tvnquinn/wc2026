import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_SESSION_COOKIE, parseAdminSessionToken } from '@/lib/auth'
import { updateMatchTeams } from '@/lib/adminFixPrediction'
import { getLeagueBySlug } from '@/lib/leagueContext'
import { revalidatePath } from 'next/cache'

type Body = {
  leagueSlug: string
  matchNum: number
  homeTeam: string
  awayTeam: string
}

function revalidateLeague(slug: string) {
  revalidatePath(`/${slug}`)
  revalidatePath(`/${slug}/predict`)
  revalidatePath(`/${slug}/picks`)
  revalidatePath(`/${slug}/admin`)
}

export async function POST(request: Request) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { leagueSlug, matchNum, homeTeam, awayTeam } = body
  if (!leagueSlug || !matchNum || !homeTeam?.trim() || !awayTeam?.trim()) {
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
    const result = await updateMatchTeams({
      matchNum: Number(matchNum),
      homeTeam,
      awayTeam,
    })
    revalidateLeague(league.slug)
    revalidatePath('/')
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
