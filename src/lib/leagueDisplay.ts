export const BRAND_PREFIX = 'WC26 Pool'

export function formatLeagueBrand(leagueName: string): string {
  return `${BRAND_PREFIX} - ${leagueName}`
}
