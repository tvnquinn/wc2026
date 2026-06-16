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
    <main className="animate-fade-in">
      <Navbar slug={league.slug} leagueName={league.name} />
      <div className="page-content">
        {league.description && (
          <p className="league-description">{league.description}</p>
        )}
        {children}
      </div>
    </main>
  )
}
