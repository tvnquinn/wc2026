export const DEMO_LEAGUE_SLUG = 'demo'
export const DEMO_PLAYER_PIN = '1234'
export const DEMO_ADMIN_PASSWORD = 'demo'

export function isDemoLeague(slug: string): boolean {
  return slug.toLowerCase() === DEMO_LEAGUE_SLUG
}
