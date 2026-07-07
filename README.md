# WC26 Pool

**Live:** [wc26pool.vercel.app](https://wc26pool.vercel.app)

Open-source World Cup 2026 prediction platform. Create a private league, share the link, and compete on every match.

## Why this exists

Most tournament pools use a **fixed bracket** — you fill it out once before kickoff and then just watch. That works for a pre-tournament rush, but most of the World Cup happens *after* that moment. Group stages upset brackets, knockouts rewrite storylines, and a one-and-done pick sheet goes quiet for weeks.

WC26 Pool is built for **active participation across the whole tournament**:

- **Predict every match** — group stage through the final, not just a static bracket tree.
- **Score every result** — exact scores and correct outcomes earn points as matches finish.
- **Escalating knockout values** — later rounds are worth more (R32 → R16 → QF → SF → Final), so a rough group stage does not knock anyone out of the running. Comebacks stay plausible; the leaderboard stays tense.
- **League scoreboard + predictions table** — see who is winning and exactly what everyone picked, match by match.

The goal is a pool that stays fun for casual and competitive players alike — easy to join, hard to run away with early, and good fuel for friendly trash talk all month long.

## How it works

- **One global schedule** — 104 matches shared by all leagues (teams, kickoffs, bracket links).
- **Per-league players & predictions** — each league has its own participants, PINs, and leaderboard.
- **Hybrid results** — one canonical World Cup scoreboard drives default scoring; leagues can optionally override individual match results.

## Rules

Each participant predicts the score of every match before kickoff. After the real result is entered, points are awarded automatically. Highest total wins.

### Making predictions

- Go to **Predict**, select or create your name, and enter scores for each match.
- Predictions **lock at kickoff** — you cannot change a pick after the match starts.
- You do not need to predict every match; any match you skip stays blank on the **Predictions** table and earns 0 points.
- Knockout bracket teams may show placeholders (e.g. W73, 1A) until earlier matches are played; those slots fill in automatically when results are entered.

### Regulation-time scoring

For each match, you earn **either** the exact-score bonus **or** the correct-outcome bonus — not both.

| Stage | Exact score | Correct winner or draw |
|-------|-------------|------------------------|
| Group stage | 3 pts | 1 pt |
| Round of 32 | 6 pts | 2 pts |
| Round of 16 | 12 pts | 4 pts |
| Quarter-final | 24 pts | 8 pts |
| Semi-final | 48 pts | 16 pts |
| Third-place match | 48 pts | 16 pts |
| Final | 96 pts | 32 pts |

- **Exact score** — your predicted home and away goals match the official result after 90 minutes (plus stoppage time) exactly.
- **Correct outcome** — you got the result right (home win, away win, or draw) but not the exact score.
- **Wrong outcome** — 0 points.

### Knockout penalty predictions (Round of 32 and later)

- Group-stage matches cannot have penalty predictions.
- If you predict the match will **end in a draw**, you may also enter a predicted **penalty shootout score** (e.g. home 5, away 3).
- You **cannot** enter a penalty prediction unless your regulation score is a draw.
- Your penalty pick implies which team you think **advances** (wins the shootout).

| Round | Penalty bonus |
|-------|---------------|
| Round of 32 | 4 pts |
| Round of 16 | 8 pts |
| Quarter-final | 16 pts |
| Semi-final / Third-place | 32 pts |
| Final | 64 pts |

## Routes

| Path | Purpose |
|------|---------|
| `/` | Landing — start here to create a league |
| `/create` | Create a new league |
| `/{slug}` | League leaderboard |
| `/{slug}/predict` | Enter predictions (4-digit PIN) |
| `/{slug}/picks` | Predictions table — everyone's picks by match |
| `/{slug}/rules` | Scoring rules |
| `/{slug}/admin` | Enter match results (league admin password) |

## Self-hosting

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon, Supabase, Vercel Postgres, etc.) |
| `AUTH_SECRET` | Yes (prod) | Random string for signing session cookies |
| `HOST_LEAGUE_ADMIN_PASSWORD` | No | Admin password for the canonical scoreboard league |
| `HOST_LEAGUE_NAME` | No | Display name for the host league |
| `HOST_LEAGUE_SLUG` | No | URL slug for the host league |

See [.env.example](.env.example). **Never commit real passwords or production URLs.**

### Local development

For quick local testing, use SQLite (`DATABASE_URL="file:./dev.db"`) and set `provider = "sqlite"` in `prisma/schema.prisma`. Production uses PostgreSQL.

```bash
npm install
npm run db:local    # SQLite only
npm run dev         # http://localhost:3000
```

**Before deploying**, ensure `prisma/schema.prisma` uses `provider = "postgresql"` and run `npm run build`.

### First-time match seed

Load the global 104-match schedule once via CLI (not exposed in the admin UI):

```bash
DATABASE_URL=... npx tsx scripts/seed-schedule.ts
```

Match results start blank until entered in the host-league admin.

### Clear all results (ops)

Host league admin → **Clear All Results** (wipes global scores and league overrides; predictions remain, points reset to 0).

For environments with direct database access:

```bash
DATABASE_URL=... npx tsx scripts/clear-match-results.ts
```

## Match schedule (`matches.csv`)

The repo-root **`matches.csv`** is the source of truth for all 104 matches (stage, teams, kickoff, bracket links). `scripts/seed-schedule.ts` loads this file into the database when empty.

Detect drift between CSV and DB:

```bash
DATABASE_URL=... npx tsx scripts/diff-match-schedule.ts
```

Knockout team names may differ from CSV placeholders after results are entered — the script flags count and team-name mismatches by `matchNum`.

## Scripts

```bash
npm run dev        # development server
npm test           # vitest unit tests
npm run test:e2e   # Playwright E2E (isolated SQLite DB)
npm run typecheck  # TypeScript check
npm run build      # prisma migrate deploy + next build (production)
npm run seed:schedule  # load matches.csv into DATABASE_URL (idempotent)
```

CI runs `typecheck`, `vitest`, and Playwright E2E on every push/PR (see `.github/workflows/ci.yml`).

### Runtime

- **Node.js 20+** (`engines` in `package.json`)
- **Next.js 16** — this project pins Next 16.x (App Router); not the older v14/v15 docs tree

## Screenshots

| Rules |
|-------|
| ![Rules](docs/screenshots/rules.png) |

| Landing | Create league |
|---------|---------------|
| ![Landing page](docs/screenshots/landing.png) | ![Create league](docs/screenshots/create.png) |

| Predict (unlocked) | Admin (logged in) |
|--------------------|-------------------|
| ![Predict](docs/screenshots/predict-auth.png) | ![Admin](docs/screenshots/admin-auth.png) |

| Leaderboard | Predictions |
|-------------|-------------|
| ![Leaderboard](docs/screenshots/leaderboard.png) | ![Predictions table](docs/screenshots/predictions.png) |

## License

MIT — see [LICENSE](LICENSE).
