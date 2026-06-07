import Link from 'next/link'

export default function GlobalHeader() {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link href="/" className="navbar-brand">
          WC26 Pool
        </Link>
        <div className="navbar-links">
          <Link href="/" className="navbar-link">Home</Link>
          <Link href="/create" className="navbar-link">Create League</Link>
        </div>
      </div>
    </nav>
  )
}
