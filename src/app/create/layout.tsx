import { redirect } from 'next/navigation'
import { hostLeagueSlugForDeploy, isHostOnlyDeploy } from '@/lib/deployMode'

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  if (isHostOnlyDeploy()) {
    redirect(`/${hostLeagueSlugForDeploy()}`)
  }
  return children
}
