const ET_TIMEZONE = 'America/New_York'

export function getETDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ET_TIMEZONE }).format(date)
}

export function formatMD(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TIMEZONE,
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date)

  const month = parts.find((p) => p.type === 'month')?.value ?? ''
  const day = parts.find((p) => p.type === 'day')?.value ?? ''
  return `${month}/${day}`
}

export function pickSparseTicks<T>(items: T[], maxTicks = 3): T[] {
  if (items.length <= maxTicks) return items
  const last = items.length - 1
  const mid = Math.floor(last / 2)
  return [items[0], items[mid], items[last]]
}
