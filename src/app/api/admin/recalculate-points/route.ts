import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { ADMIN_SESSION_COOKIE, parseAdminSessionToken } from '@/lib/auth'
import { recalculatePointsForStages } from '@/lib/recalculatePoints'
import { getLeagueBySlug } from '@/lib/leagueContext'

function revalidateLeague(slug: string) {
  revalidatePath(`/${slug}`)
  revalidatePath(`/${slug}/predict`)
  revalidatePath(`/${slug}/picks`)
  revalidatePath(`/${slug}/admin`)
}

export async function POST(request: Request) {
  let leagueSlug = 'sleepwell'
  try {
    const body = (await request.json()) as { leagueSlug?: string }
    if (body.leagueSlug) leagueSlug = body.leagueSlug
  } catch {
    // default slug
  }

  const league = await getLeagueBySlug(leagueSlug)
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  const session = token ? parseAdminSessionToken(token) : null
  if (!session || session.leagueId !== league.id) {
    return NextResponse.json({ error: 'Admin login required' }, { status: 401 })
  }

  const result = await recalculatePointsForStages()
  revalidateLeague(league.slug)
  revalidatePath('/')
  return NextResponse.json(result)
}
