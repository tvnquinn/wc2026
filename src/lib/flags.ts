export function getCountryCode(team: string): string | null {
  const codes: Record<string, string> = {
    // Group A
    'Mexico': 'mx',
    'South Africa': 'za',
    'South Korea': 'kr',
    'Czechia': 'cz',

    // Group B
    'Canada': 'ca',
    'Qatar': 'qa',
    'Switzerland': 'ch',
    'Bosnia and Herzegovina': 'ba',

    // Group C
    'Brazil': 'br',
    'Morocco': 'ma',
    'Haiti': 'ht',
    'Scotland': 'gb-sct',

    // Group D
    'United States': 'us',
    'Paraguay': 'py',
    'Australia': 'au',
    'Türkiye': 'tr',

    // Group E
    'Germany': 'de',
    'Curacao': 'cw',
    'Ivory Coast': 'ci',
    'Ecuador': 'ec',

    // Group F
    'Netherlands': 'nl',
    'Japan': 'jp',
    'Tunisia': 'tn',
    'Sweden': 'se',

    // Group G
    'Belgium': 'be',
    'Egypt': 'eg',
    'Iran': 'ir',
    'New Zealand': 'nz',

    // Group H
    'Spain': 'es',
    'Cape Verde': 'cv',
    'Saudi Arabia': 'sa',
    'Uruguay': 'uy',

    // Group I
    'France': 'fr',
    'Senegal': 'sn',
    'Norway': 'no',
    'Iraq': 'iq',

    // Group J
    'Argentina': 'ar',
    'Algeria': 'dz',
    'Austria': 'at',
    'Jordan': 'jo',

    // Group K
    'Portugal': 'pt',
    'Uzbekistan': 'uz',
    'Colombia': 'co',
    'DR Congo': 'cd',

    // Group L
    'England': 'gb-eng',
    'Croatia': 'hr',
    'Ghana': 'gh',
    'Panama': 'pa',
  }
  return codes[team] ?? null
}
