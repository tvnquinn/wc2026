import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link href="/" className="navbar-brand">
          World Cup 2026 Prediction Pool
        </Link>
        <div className="navbar-links">
          <Link href="/" className="navbar-link">Leaderboard</Link>
          <Link href="/predict" className="navbar-link">Predict</Link>
          <Link href="/picks" className="navbar-link">Predictions</Link>
          <Link href="/rules" className="navbar-link">Rules</Link>
          <Link href="/admin" className="navbar-link">Admin</Link>
        </div>
      </div>
    </nav>
  )
}
