/** Display match number as M17 (CSV stores plain numbers like "17"). */
export function formatMatchNumLabel(matchNum: string | null | undefined): string {
  const trimmed = matchNum?.trim()
  if (!trimmed) return ''
  return trimmed.toUpperCase().startsWith('M') ? trimmed.toUpperCase() : `M${trimmed}`
}
