import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import { getLeagueBySlug } from '@/lib/leagueContext'
import { formatLeagueBrand } from '@/lib/leagueDisplay'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const league = await getLeagueBySlug(slug)
  return {
    title: formatLeagueBrand(league.name),
    description: league.description ?? `Prediction pool for ${league.name}`,
  }
}

export default async function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const league = await getLeagueBySlug(slug)

  return (
    <>
      <Navbar slug={league.slug} leagueName={league.name} />
      {league.description && (
        <p
          style={{
            textAlign: 'center',
            margin: '0.75rem 1rem 0',
            fontSize: '0.95rem',
            color: 'var(--text-muted)',
            maxWidth: '720px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {league.description}
        </p>
      )}
      {children}
    </>
  )
}
