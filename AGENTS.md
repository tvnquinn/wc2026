# AGENTS.md — WC26 Pool

Conventions for humans and AI assistants working in this repo.

## Stack

- **Next.js 16** (App Router), React 19, TypeScript
- **Prisma** + PostgreSQL in production; SQLite optional for local dev (`prisma/schema.prisma` provider)
- **Vitest** for unit tests in `src/lib/**/*.test.ts`
- **Server actions** in `src/app/actions.ts` (single module today; split by domain if it grows further)

## Project layout

| Path | Purpose |
|------|---------|
| `src/app/[slug]/` | Per-league pages (leaderboard, predict, picks, rules, admin) |
| `src/app/actions.ts` | All `'use server'` mutations |
| `src/lib/` | Pure logic, scoring, bracket, auth helpers, tests |
| `matches.csv` | Source of truth for the 104-match schedule (see README) |
| `scripts/` | Ops CLIs (`seed-schedule`, seed demo, clear results, E2E, schedule diff) |
| `prisma/migrations/` | Postgres migrations; run via `prisma migrate deploy` on build |

## Privilege model

- **League admin** — session cookie scoped to one `leagueId`; can reset that league, enter results (overrides for non-host leagues).
- **Global / host league admin** — slug from `HOST_LEAGUE_SLUG` or `GLOBAL_SCORER_SLUG` in `src/lib/league.ts`; only this league can write canonical `Match` scores or **Clear All Results**. Schedule seeding is CLI-only (`scripts/seed-schedule.ts`).

Do not expose global operations to non-host league admins.

## Environment

Required in production:

- `DATABASE_URL` — PostgreSQL
- `AUTH_SECRET` — session signing (app fails at startup if missing; see `src/instrumentation.ts`)

Optional: `HOST_LEAGUE_SLUG`, `HOST_LEAGUE_NAME`, `HOST_LEAGUE_ADMIN_PASSWORD`

## Commands

```bash
npm run dev          # local Next dev server
npm test             # vitest
npm run test:e2e     # Playwright (via scripts/run-e2e.ts)
npm run typecheck    # tsc --noEmit
npm run build        # migrate deploy + production build
npm run seed:schedule  # load matches.csv (idempotent)
```

## When changing scoring or results

1. Update `src/lib/scoring.ts` and tests
2. `recalculatePointsForMatch` in `src/lib/recalculatePoints.ts` must run after any result write — `Prediction.points` is denormalized; a missed recalc silently skews the leaderboard
3. `LeagueResultOverride` fields must stay aligned with `MatchResultFields` in `src/lib/effectiveResults.ts`

## Do not

- Commit `prisma/dev.db`, `.env`, or production credentials
- Hardcode host league slug in new code — use `resolveHostLeagueSlug()` from `src/lib/league.ts`
- Rely on `node_modules/next/dist/docs/` — it is not shipped; use [nextjs.org/docs](https://nextjs.org/docs) instead
