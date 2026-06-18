import { formatOverlapMessage } from '@/lib/predictionOverlap'

export default function PredictionOverlapNote({ names }: { names: string[] }) {
  const message = formatOverlapMessage(names)
  if (!message) return null

  return (
    <p className="predict-overlap-note" role="note">
      <span className="predict-overlap-icon" aria-hidden="true">
        👥
      </span>
      <span className="predict-overlap-text">{message}</span>
    </p>
  )
}
