export type MatchResultFields = {
  homeScore: number | null
  awayScore: number | null
  pkHomeScore: number | null
  pkAwayScore: number | null
  isFinished: boolean
}

export type EffectiveResultInput = {
  global: MatchResultFields
  override: MatchResultFields | null
}

type MatchLike = {
  homeScore: number | null
  awayScore: number | null
  pkHomeScore: number | null
  pkAwayScore: number | null
  isFinished: boolean
}

export function globalFromMatch(match: MatchLike): MatchResultFields {
  return {
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    pkHomeScore: match.pkHomeScore,
    pkAwayScore: match.pkAwayScore,
    isFinished: match.isFinished,
  }
}

export function overrideFromRow(override: MatchResultFields | null | undefined): MatchResultFields | null {
  return override ?? null
}

export function effectiveInputForMatch(
  match: MatchLike,
  override: MatchResultFields | null | undefined
): EffectiveResultInput {
  return {
    global: globalFromMatch(match),
    override: overrideFromRow(override),
  }
}

/** League override wins; otherwise fall back to shared global scores. */
export function resolveEffectiveResult(input: EffectiveResultInput): MatchResultFields {
  if (input.override) {
    return input.override
  }
  return input.global
}

export function isScoredForLeague(input: EffectiveResultInput): boolean {
  const effective = resolveEffectiveResult(input)
  return effective.isFinished && effective.homeScore != null && effective.awayScore != null
}

/** Match row with scores/finished state as this league sees them (override > global). */
export function matchDisplayForLeague<T extends MatchLike>(
  match: T,
  override: MatchResultFields | null | undefined
): T {
  const input = effectiveInputForMatch(match, override)
  if (!isScoredForLeague(input)) {
    return {
      ...match,
      homeScore: null,
      awayScore: null,
      pkHomeScore: null,
      pkAwayScore: null,
      isFinished: false,
    }
  }

  const effective = resolveEffectiveResult(input)
  return {
    ...match,
    homeScore: effective.homeScore,
    awayScore: effective.awayScore,
    pkHomeScore: effective.pkHomeScore,
    pkAwayScore: effective.pkAwayScore,
    isFinished: true,
  }
}
