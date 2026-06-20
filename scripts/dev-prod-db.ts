/**
 * Runs next dev against the production Neon database (same data as wc26pool.vercel.app).
 * Requires DATABASE_URL in .env.local — copy from Neon dashboard (Vercel env pull leaves it blank).
 *
 * Usage: npm run dev:prod
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'

const ROOT = process.cwd()
const ENV_FILES = [
  join(ROOT, '.env.local'),
  join(ROOT, '.env.production.local'),
  join(ROOT, '.env.vercel.tmp'),
]

function loadEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {}
  const out: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
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
    if (value) out[key] = value
  }
  return out
}

function loadEnv(): Record<string, string> {
  const merged: Record<string, string> = {}
  for (const file of ENV_FILES) {
    Object.assign(merged, loadEnvFile(file))
  }
  return merged
}

const envFiles = loadEnv()
const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  envFiles.DATABASE_URL?.trim() ||
  envFiles.DATABASE_POSTGRES_PRISMA_URL?.trim() ||
  envFiles.DATABASE_POSTGRES_URL?.trim()

if (!databaseUrl) {
  console.error(`
Missing DATABASE_URL for production database access.

Vercel "env pull" cannot decrypt Neon integration secrets — DATABASE_URL stays empty in
.env.production.local. You must copy the connection string manually from Neon:

  1. Run:  npx vercel integration open neon neon-charcoal-kettle
  2. In Neon → Dashboard → Connection Details → copy the **pooled** connection string
  3. Add to .env.local (create the file if needed):

     DATABASE_URL="postgresql://...?sslmode=require"
     AUTH_SECRET="any-long-random-string"

Then run: npm run dev:prod
`)
  process.exit(1)
}

async function verifyDatabaseConnection(url: string): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url } } })
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`
Database connection failed.

Check that DATABASE_URL in .env.local is the **pooled** Neon string (host contains "-pooler")
and includes ?sslmode=require.

Error: ${message}
`)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

await verifyDatabaseConnection(databaseUrl)

const env = {
  ...process.env,
  ...envFiles,
  DATABASE_URL: databaseUrl,
  AUTH_SECRET: process.env.AUTH_SECRET ?? envFiles.AUTH_SECRET ?? 'local-dev-auth-secret',
  HOST_LEAGUE_SLUG: process.env.HOST_LEAGUE_SLUG ?? envFiles.HOST_LEAGUE_SLUG ?? 'sleepwell',
  HOST_LEAGUE_NAME: process.env.HOST_LEAGUE_NAME ?? envFiles.HOST_LEAGUE_NAME ?? 'SleepWell Fam',
}

console.log('Using production DATABASE_URL — same data as wc26pool.vercel.app/sleepwell\n')

execSync('npx next dev', { stdio: 'inherit', cwd: ROOT, env })
