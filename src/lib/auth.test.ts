import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSessionToken } from './auth'

describe('auth production guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('throws when AUTH_SECRET is missing in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('AUTH_SECRET', '')
    expect(() => createSessionToken('user-1', 'league-1')).toThrow(
      /AUTH_SECRET environment variable is required/
    )
  })

  it('allows session creation in development without AUTH_SECRET', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('AUTH_SECRET', '')
    expect(() => createSessionToken('user-1', 'league-1')).not.toThrow()
  })
})
