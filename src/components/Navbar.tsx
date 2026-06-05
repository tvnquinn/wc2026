import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link href="/" className="navbar-brand">
          2026 World Cup - Sleepwell Fam ⚽
        </Link>
        <div className="navbar-links">
          <Link href="/" className="navbar-link">Leaderboard</Link>
          <Link href="/predict" className="navbar-link">Predict</Link>
          <Link href="/picks" className="navbar-link">Guesses Table</Link>
          <Link href="/rules" className="navbar-link">Scoring Rules</Link>
          <Link href="/admin" className="navbar-link">Enter Results</Link>
        </div>
      </div>
    </nav>
  )
}
