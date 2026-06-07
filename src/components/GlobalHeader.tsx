import Link from 'next/link'
import { isHostOnlyDeploy } from '@/lib/deployMode'

export default function GlobalHeader({
  showCreateLeague = !isHostOnlyDeploy(),
}: {
  showCreateLeague?: boolean
}) {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link href="/" className="navbar-brand">
          WC26 Pool
        </Link>
        <div className="navbar-links">
          {showCreateLeague && (
            <Link href="/create" className="navbar-link">
              Create League
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
