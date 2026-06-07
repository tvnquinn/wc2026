# WC26 Pool

Open-source World Cup 2026 prediction platform. Create a private league, share the link, and compete on every match.

**Live:** [wc26pool.vercel.app](https://wc26pool.vercel.app)

## Screenshots

| Landing | Create league |
|---------|---------------|
| ![Landing page](docs/screenshots/landing.png) | ![Create league](docs/screenshots/create.png) |

| Predict (unlocked) | Admin (logged in) |
|--------------------|-------------------|
| ![Predict](docs/screenshots/predict-auth.png) | ![Admin](docs/screenshots/admin-auth.png) |

| Leaderboard | Picks grid |
|-------------|------------|
| ![Leaderboard](docs/screenshots/leaderboard.png) | ![Picks](docs/screenshots/picks.png) |

| Rules |
|-------|
| ![Rules](docs/screenshots/rules.png) |

## How it works

- **One global schedule** — 104 matches shared by all leagues (teams, kickoffs, bracket links).
- **Per-league users & predictions** — each league has its own players, PINs, and leaderboard.
- **Hybrid results** — one canonical World Cup scoreboard drives default scoring; leagues can optionally override individual match results.

## Routes

| Path | Purpose |
|------|---------|
| `/` | Landing — start here to create a league |
| `/create` | Create a new league |
| `/{slug}` | League leaderboard |
| `/{slug}/predict` | Enter predictions (4-digit PIN) |
| `/{slug}/picks` | View everyone's picks |
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

A host-league admin must seed the global 104-match schedule once: open `/{host-slug}/admin`, log in, and click **Seed Match Schedule**. Match results start blank until entered.

### Clear all results (ops)

Host league admin → **Clear All Results** (wipes global scores and league overrides; predictions remain, points reset to 0).

For environments with direct database access:

```bash
DATABASE_URL=... npx tsx scripts/clear-match-results.ts
```

## Scripts

```bash
npm run dev      # development server
npm test         # vitest unit tests (39 tests)
npm run build    # prisma migrate deploy + next build (production)
```

## License

MIT — see [LICENSE](LICENSE).
