'use client'

export default function FinishedMatchesToggle({
  finishedCount,
  showFinished,
  onToggle,
}: {
  finishedCount: number
  showFinished: boolean
  onToggle: () => void
}) {
  if (finishedCount === 0) return null

  return (
    <button type="button" className="btn picks-finished-toggle" onClick={onToggle}>
      {showFinished
        ? `Hide ${finishedCount} completed match${finishedCount === 1 ? '' : 'es'}`
        : `Show ${finishedCount} completed match${finishedCount === 1 ? '' : 'es'}`}
    </button>
  )
}
