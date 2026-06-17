export default function JackpotBanner({
  balance,
  alwaysShow = false,
}: {
  balance: number
  alwaysShow?: boolean
}) {
  if (!alwaysShow && balance <= 0) return null

  return (
    <div className="card jackpot-banner">
      <span className="jackpot-banner-label">Current jackpot</span>
      <span className="jackpot-banner-amount">{balance} pts</span>
    </div>
  )
}
