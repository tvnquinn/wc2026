import Link from 'next/link'
import { formatLeagueBrand } from '@/lib/leagueDisplay'

export default function Navbar({
  slug,
  leagueName,
}: {
  slug: string
  leagueName: string
}) {
  const base = `/${slug}`
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link href={base} className="navbar-brand">
          {formatLeagueBrand(leagueName)}
        </Link>
        <div className="navbar-links">
          <Link href={base} className="navbar-link">Leaderboard</Link>
          <Link href={`${base}/predict`} className="navbar-link">Predict</Link>
          <Link href={`${base}/picks`} className="navbar-link">Predictions</Link>
          <Link href={`${base}/rules`} className="navbar-link">Rules</Link>
          <Link href={`${base}/admin`} className="navbar-link">Admin</Link>
        </div>
      </div>
    </nav>
  )
}
