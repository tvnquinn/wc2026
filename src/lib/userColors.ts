/** Shared palette — same order used in Predictions headers and score-history chart. */
export const USER_COLORS = [
  '#3b82f6',
  '#E61D25',
  '#fbbf24',
  '#3CAC3B',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#f97316',
  '#84cc16',
  '#a855f7',
] as const

/** Fixed colors for specific players (case-insensitive name match). */
const NAME_COLOR_OVERRIDES: Record<string, string> = {
  'cocopirlo': '#fbbf24',
  'cr7 is him': '#E61D25',
}

function colorForUser(user: { id: string; name: string }, index: number): string {
  const override = NAME_COLOR_OVERRIDES[user.name.trim().toLowerCase()]
  if (override) return override
  return USER_COLORS[index % USER_COLORS.length]
}

export function userColorMap(users: { id: string; name: string }[]): Map<string, string> {
  const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name))
  const map = new Map<string, string>()
  sorted.forEach((user, index) => {
    map.set(user.id, colorForUser(user, index))
  })
  return map
}

export function userChartLines(
  users: { id: string; name: string }[]
): { key: string; color: string }[] {
  const colors = userColorMap(users)
  return users.map((user) => ({
    key: user.name,
    color: colors.get(user.id) ?? USER_COLORS[0],
  }))
}
