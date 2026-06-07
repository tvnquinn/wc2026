import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { resolveHostLeagueSlug } from '@/lib/league'

const LEGACY_PATHS = ['predict', 'picks', 'rules', 'admin'] as const

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostSlug = resolveHostLeagueSlug()

  for (const segment of LEGACY_PATHS) {
    if (pathname === `/${segment}` || pathname === `/${segment}/`) {
      const url = request.nextUrl.clone()
      url.pathname = `/${hostSlug}/${segment}`
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/predict', '/picks', '/rules', '/admin'],
}
