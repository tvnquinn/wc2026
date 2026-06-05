import crypto from 'crypto'

export const SESSION_COOKIE = 'wc_predict_session'
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

const PIN_REGEX = /^\d{4}$/

export function validatePin(pin: string): boolean {
  return PIN_REGEX.test(pin)
}

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(pin, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPin(pin: string, stored: string | null | undefined): boolean {
  if (!stored) return false
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = crypto.scryptSync(pin, salt, 64).toString('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'))
  } catch {
    return false
  }
}

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

export function createSessionToken(userId: string): string {
  const payload = JSON.stringify({
    userId,
    exp: Date.now() + SESSION_MAX_AGE_MS,
  })
  const encoded = Buffer.from(payload).toString('base64url')
  const sig = crypto
    .createHmac('sha256', getAuthSecret())
    .update(encoded)
    .digest('base64url')
  return `${encoded}.${sig}`
}

export function parseSessionToken(token: string): string | null {
  const [encoded, sig] = token.split('.')
  if (!encoded || !sig) return null

  const expected = crypto
    .createHmac('sha256', getAuthSecret())
    .update(encoded)
    .digest('base64url')

  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null
    }
  } catch {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (!payload.userId || typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      return null
    }
    return payload.userId as string
  } catch {
    return null
  }
}

export function getSessionMaxAgeSeconds(): number {
  return Math.floor(SESSION_MAX_AGE_MS / 1000)
}
