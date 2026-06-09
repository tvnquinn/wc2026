/**
 * Runs next dev against the production Neon database (same data as wc26pool.vercel.app).
 * Requires DATABASE_URL in .env.local — copy from Vercel → sleepwell-wc2026 → Storage → Neon.
 *
 * Usage: npm run dev:prod
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const ENV_LOCAL = join(ROOT, '.env.local')

function loadEnvLocal(): Record<string, string> {
  if (!existsSync(ENV_LOCAL)) return {}
  const out: Record<string, string> = {}
  for (const line of readFileSync(ENV_LOCAL, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx)
    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

const envLocal = loadEnvLocal()
const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  envLocal.DATABASE_URL?.trim() ||
  envLocal.DATABASE_POSTGRES_PRISMA_URL?.trim() ||
  envLocal.DATABASE_POSTGRES_URL?.trim()

if (!databaseUrl) {
  console.error(`
Missing DATABASE_URL for production database access.

Vercel CLI cannot decrypt Neon integration secrets locally. Add your connection string to .env.local:

  1. Open: npx vercel integration open neon neon-charcoal-kettle
  2. Copy the pooled Postgres connection string
  3. Add to .env.local:

     DATABASE_URL="postgres://..."
     AUTH_SECRET="any-long-random-string"

Then run: npm run dev:prod
`)
  process.exit(1)
}

const env = {
  ...process.env,
  ...envLocal,
  DATABASE_URL: databaseUrl,
  AUTH_SECRET: process.env.AUTH_SECRET ?? envLocal.AUTH_SECRET ?? 'local-dev-auth-secret',
  HOST_LEAGUE_SLUG: process.env.HOST_LEAGUE_SLUG ?? envLocal.HOST_LEAGUE_SLUG ?? 'sleepwell',
  HOST_LEAGUE_NAME: process.env.HOST_LEAGUE_NAME ?? envLocal.HOST_LEAGUE_NAME ?? 'SleepWell Fam',
}

console.log('Using production DATABASE_URL — same data as wc26pool.vercel.app/sleepwell\n')

execSync('npx next dev', { stdio: 'inherit', cwd: ROOT, env })
