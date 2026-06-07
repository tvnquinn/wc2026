const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/

/** Only this league can write the canonical World Cup scoreboard. */
export const GLOBAL_SCORER_SLUG = 'sleepwell'

const MAX_USER_NAME_LENGTH = 40

export function resolveHostLeagueSlug(): string {
  return process.env.HOST_LEAGUE_SLUG?.trim().toLowerCase() || GLOBAL_SCORER_SLUG
}

export function isGlobalScorerLeague(slug: string): boolean {
  return slug.toLowerCase() === resolveHostLeagueSlug()
}

/** Throws if the league is not the global scorer (host) league. */
export function requireGlobalScorerLeague(slug: string): void {
  if (!isGlobalScorerLeague(slug)) {
    throw new Error('This operation requires global host league admin privileges')
  }
}

export const RESERVED_SLUGS = new Set([
  'create',
  'admin',
  'api',
  'rules',
  'predict',
  'picks',
  'manifest',
  'favicon',
])

export function validateSlug(slug: string): string | null {
  const normalized = slug.trim().toLowerCase()
  if (normalized.length < 3 || normalized.length > 32) {
    return 'Slug must be 3–32 characters'
  }
  if (!SLUG_REGEX.test(normalized)) {
    return 'Slug must be lowercase letters, numbers, and hyphens only'
  }
  if (RESERVED_SLUGS.has(normalized)) {
    return 'That slug is reserved'
  }
  return null
}

export function validateLeagueName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Name is required'
  if (trimmed.length > 60) return 'Name must be 60 characters or fewer'
  return null
}

export function validateAdminPassword(password: string): string | null {
  if (password.length < 4) return 'Admin password must be at least 4 characters'
  if (password.length > 128) return 'Admin password must be 128 characters or fewer'
  return null
}

export function validateUserName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Name is required'
  if (trimmed.length > MAX_USER_NAME_LENGTH) {
    return `Name must be ${MAX_USER_NAME_LENGTH} characters or fewer`
  }
  return null
}
