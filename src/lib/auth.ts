import crypto from 'crypto'

export const SESSION_COOKIE = 'wc_predict_session'
export const ADMIN_SESSION_COOKIE = 'wc_admin_session'
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

const PIN_REGEX = /^\d{4}$/

export type PlayerSession = {
  userId: string
  leagueId: string
}

export type AdminSession = {
  leagueId: string
}

export function validatePin(pin: string): boolean {
  return PIN_REGEX.test(pin)
}

export function hashSecret(secret: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(secret, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifySecret(secret: string, stored: string | null | undefined): boolean {
  if (!stored) return false
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = crypto.scryptSync(secret, salt, 64).toString('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'))
  } catch {
    return false
  }
}

export const hashPin = hashSecret
export const verifyPin = verifySecret

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET environment variable is required in production')
    }
    return 'dev-auth-secret-change-me'
  }
  return secret
}

function signPayload(payload: object): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', getAuthSecret()).update(encoded).digest('base64url')
  return `${encoded}.${sig}`
}

function parseSignedPayload<T extends { exp: number }>(token: string): T | null {
  const [encoded, sig] = token.split('.')
  if (!encoded || !sig) return null

  const expected = crypto.createHmac('sha256', getAuthSecret()).update(encoded).digest('base64url')
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function createSessionToken(userId: string, leagueId: string): string {
  return signPayload({ userId, leagueId, exp: Date.now() + SESSION_MAX_AGE_MS })
}

export function parseSessionToken(token: string): PlayerSession | null {
  const payload = parseSignedPayload<PlayerSession & { exp: number }>(token)
  if (!payload?.userId || !payload.leagueId) return null
  return { userId: payload.userId, leagueId: payload.leagueId }
}

export function createAdminSessionToken(leagueId: string): string {
  return signPayload({ leagueId, exp: Date.now() + SESSION_MAX_AGE_MS })
}

export function parseAdminSessionToken(token: string): AdminSession | null {
  const payload = parseSignedPayload<AdminSession & { exp: number }>(token)
  if (!payload?.leagueId) return null
  return { leagueId: payload.leagueId }
}

export function getSessionMaxAgeSeconds(): number {
  return Math.floor(SESSION_MAX_AGE_MS / 1000)
}
