import { GLOBAL_SCORER_SLUG } from '@/lib/league'

/** Production ships the host league only (sleepwell). Local dev keeps multi-league. */
export function isHostOnlyDeploy(): boolean {
  if (process.env.HOST_ONLY_DEPLOY === 'false') return false
  if (process.env.HOST_ONLY_DEPLOY === 'true') return true
  return process.env.VERCEL_ENV === 'production'
}

export function hostLeagueSlugForDeploy(): string {
  return process.env.HOST_LEAGUE_SLUG?.trim().toLowerCase() || GLOBAL_SCORER_SLUG
}
