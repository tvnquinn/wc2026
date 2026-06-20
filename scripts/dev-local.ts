/**
 * Local dev against SQLite — mirrors wc26pool.vercel.app/sleepwell without prod DB access.
 * Temporarily swaps prisma/schema.prisma to SQLite, seeds the host league, runs next dev.
 *
 * Usage: npm run dev:local
 */
import { execSync, spawn } from 'node:child_process'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const SCHEMA = join(ROOT, 'prisma/schema.prisma')
const SQLITE_SCHEMA = join(ROOT, 'prisma/schema.sqlite.prisma')
const POSTGRES_BACKUP = join(ROOT, 'prisma/schema.postgres.prisma')
const DEV_DB = join(ROOT, 'prisma/dev.db')

function run(cmd: string, env: NodeJS.ProcessEnv = process.env) {
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, env })
}

function prepareLocalEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    DATABASE_URL: `file:${DEV_DB}`,
    AUTH_SECRET: process.env.AUTH_SECRET ?? 'local-dev-auth-secret',
    HOST_LEAGUE_SLUG: process.env.HOST_LEAGUE_SLUG ?? 'sleepwell',
    HOST_LEAGUE_NAME: process.env.HOST_LEAGUE_NAME ?? 'SleepWell Fam',
  }
}

function useSqliteSchema() {
  copyFileSync(SCHEMA, POSTGRES_BACKUP)
  writeFileSync(SCHEMA, readFileSync(SQLITE_SCHEMA, 'utf8'))
}

function restorePostgresSchema() {
  if (!existsSync(POSTGRES_BACKUP)) return
  writeFileSync(SCHEMA, readFileSync(POSTGRES_BACKUP, 'utf8'))
}

function restoreAndExit(code = 0) {
  try {
    restorePostgresSchema()
    run('npx prisma generate', process.env)
  } catch (err) {
    console.error('Failed to restore Postgres Prisma schema:', err)
    process.exitCode = 1
  }
  process.exit(code)
}

const localEnv = prepareLocalEnv()
let devProcess: ReturnType<typeof spawn> | null = null

process.on('SIGINT', () => {
  devProcess?.kill('SIGINT')
})
process.on('SIGTERM', () => {
  devProcess?.kill('SIGTERM')
})

try {
  useSqliteSchema()
  run('npx prisma db push --accept-data-loss --force-reset', localEnv)
  run('npx prisma generate', localEnv)
  run('npx tsx scripts/seed-local-host.ts', localEnv)
  run('npx tsx scripts/import-prod-snapshot.ts', localEnv)

  console.log('\nStarting Next.js dev server (Ctrl+C restores Postgres schema)...\n')

  devProcess = spawn('npx', ['next', 'dev'], {
    cwd: ROOT,
    env: localEnv,
    stdio: 'inherit',
  })

  devProcess.on('exit', (code, signal) => {
    restorePostgresSchema()
    try {
      run('npx prisma generate', process.env)
    } catch (err) {
      console.error('Failed to restore Postgres Prisma schema:', err)
      process.exitCode = 1
    }
    if (signal) process.kill(process.pid, signal)
    process.exit(code ?? 0)
  })
} catch (err) {
  console.error(err)
  restoreAndExit(1)
}
