/**
 * Runs Playwright E2E against an isolated SQLite database.
 * Temporarily swaps prisma/schema.prisma to the SQLite variant, then restores Postgres.
 */
import { execSync } from 'node:child_process'
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const SCHEMA = join(ROOT, 'prisma/schema.prisma')
const SQLITE_SCHEMA = join(ROOT, 'prisma/schema.sqlite.prisma')
const POSTGRES_BACKUP = join(ROOT, 'prisma/schema.postgres.prisma')

function run(cmd: string, env: NodeJS.ProcessEnv = process.env) {
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, env })
}

function prepareSqliteE2eEnv(): NodeJS.ProcessEnv {
  const e2eDb = join(ROOT, 'prisma', 'e2e.db')
  return {
    ...process.env,
    DATABASE_URL: `file:${e2eDb}`,
    AUTH_SECRET: process.env.AUTH_SECRET ?? 'e2e-test-auth-secret',
    E2E_PORT: process.env.E2E_PORT ?? '3001',
  }
}

function useSqliteSchema() {
  copyFileSync(SCHEMA, POSTGRES_BACKUP)
  writeFileSync(SCHEMA, readFileSync(SQLITE_SCHEMA, 'utf8'))
}

function restorePostgresSchema() {
  writeFileSync(SCHEMA, readFileSync(POSTGRES_BACKUP, 'utf8'))
}

const e2eEnv = prepareSqliteE2eEnv()

try {
  useSqliteSchema()
  run('npx prisma db push --accept-data-loss', e2eEnv)
  run('npx prisma generate', e2eEnv)
  run('npx tsx scripts/seed-e2e-league.ts', e2eEnv)
  run('npx playwright test', e2eEnv)
} finally {
  try {
    restorePostgresSchema()
    run('npx prisma generate', process.env)
  } catch (err) {
    console.error('Failed to restore Postgres Prisma schema:', err)
    process.exitCode = 1
  }
}
