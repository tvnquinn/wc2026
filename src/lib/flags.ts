export function getFlag(team: string): string {
  const flags: Record<string, string> = {
    // Group A
    'Mexico': '🇲🇽',
    'South Africa': '🇿🇦',
    'South Korea': '🇰🇷',

    // Group B
    'Canada': '🇨🇦',
    'Qatar': '🇶🇦',
    'Switzerland': '🇨🇭',

    // Group C
    'Brazil': '🇧🇷',
    'Morocco': '🇲🇦',
    'Haiti': '🇭🇹',
    'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',

    // Group D
    'United States': '🇺🇸',
    'Paraguay': '🇵🇾',
    'Australia': '🇦🇺',

    // Group E
    'Germany': '🇩🇪',
    'Curacao': '🇨🇼',
    'Ivory Coast': '🇨🇮',
    'Ecuador': '🇪🇨',

    // Group F
    'Netherlands': '🇳🇱',
    'Japan': '🇯🇵',
    'Tunisia': '🇹🇳',

    // Group G
    'Belgium': '🇧🇪',
    'Egypt': '🇪🇬',
    'Iran': '🇮🇷',
    'New Zealand': '🇳🇿',

    // Group H
    'Spain': '🇪🇸',
    'Cape Verde': '🇨🇻',
    'Saudi Arabia': '🇸🇦',
    'Uruguay': '🇺🇾',

    // Group I
    'France': '🇫🇷',
    'Senegal': '🇸🇳',
    'Norway': '🇳🇴',

    // Group J
    'Argentina': '🇦🇷',
    'Algeria': '🇩🇿',
    'Austria': '🇦🇹',
    'Jordan': '🇯🇴',

    // Group K
    'Portugal': '🇵🇹',
    'Uzbekistan': '🇺🇿',
    'Colombia': '🇨🇴',

    // Group L
    'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'Croatia': '🇭🇷',
    'Ghana': '🇬🇭',
    'Panama': '🇵🇦',

    // Placeholders for playoff / TBD teams
    'UEFA A': '🇪🇺',
    'UEFA B': '🇪🇺',
    'UEFA C': '🇪🇺',
    'UEFA D': '🇪🇺',
    'FIFA 1': '🌍',
    'FIFA 2': '🌍',
    'TBD': '🏳️',
  }
  return flags[team] || '🏳️'
}
