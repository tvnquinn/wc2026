import { getCountryCode } from '@/lib/flags'

export default function TeamFlag({ team }: { team: string }) {
  const code = getCountryCode(team)
  if (!code) return null

  return (
    <img
      src={`https://flagcdn.com/w20/${code}.png`}
      srcSet={`https://flagcdn.com/w40/${code}.png 2x`}
      width={20}
      height={15}
      alt=""
      className="team-flag"
      loading="lazy"
    />
  )
}
