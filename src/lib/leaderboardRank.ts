/** Standard competition ranking: tied scores share a rank; next rank skips (1, 2, 3, 3, 3, 6, …). */
export function assignCompetitionRanks<T extends { totalPoints: number }>(
  sortedByPointsDesc: T[]
): (T & { rank: number })[] {
  const result: (T & { rank: number })[] = []
  let rank = 1

  for (let i = 0; i < sortedByPointsDesc.length; i++) {
    const entry = sortedByPointsDesc[i]
    if (i > 0 && entry.totalPoints !== sortedByPointsDesc[i - 1].totalPoints) {
      rank = i + 1
    }
    result.push({ ...entry, rank })
  }

  return result
}
