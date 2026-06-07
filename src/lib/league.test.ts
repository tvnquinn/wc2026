import { describe, expect, it } from 'vitest'
import {
  isGlobalScorerLeague,
  requireGlobalScorerLeague,
  resolveHostLeagueSlug,
  validateAdminPassword,
  validateLeagueName,
  validateSlug,
  validateUserName,
} from './league'

describe('isGlobalScorerLeague', () => {
  it('only sleepwell is the global scorer', () => {
    expect(isGlobalScorerLeague('sleepwell')).toBe(true)
    expect(isGlobalScorerLeague('Sleepwell')).toBe(true)
    expect(isGlobalScorerLeague('other-pool')).toBe(false)
  })
})

describe('validateSlug', () => {
  it('accepts valid slugs', () => {
    expect(validateSlug('sleepwell')).toBeNull()
    expect(validateSlug('my-pool-26')).toBeNull()
  })

  it('rejects invalid slugs', () => {
    expect(validateSlug('ab')).not.toBeNull()
    expect(validateSlug('Create')).not.toBeNull()
    expect(validateSlug('admin')).not.toBeNull()
    expect(validateSlug('-bad')).not.toBeNull()
  })
})

describe('validateLeagueName', () => {
  it('requires a name', () => {
    expect(validateLeagueName('  ')).not.toBeNull()
    expect(validateLeagueName('Office Pool')).toBeNull()
  })
})

describe('resolveHostLeagueSlug', () => {
  it('defaults to the global scorer slug', () => {
    expect(resolveHostLeagueSlug()).toBe('sleepwell')
  })
})

describe('requireGlobalScorerLeague', () => {
  it('allows the host league slug', () => {
    expect(() => requireGlobalScorerLeague('sleepwell')).not.toThrow()
  })

  it('rejects non-host leagues', () => {
    expect(() => requireGlobalScorerLeague('office-pool')).toThrow(/global host league/)
  })
})

describe('validateUserName', () => {
  it('rejects empty names', () => {
    expect(validateUserName('   ')).not.toBeNull()
  })

  it('rejects names over 40 characters', () => {
    expect(validateUserName('a'.repeat(41))).not.toBeNull()
  })

  it('accepts normal names', () => {
    expect(validateUserName('Alex')).toBeNull()
  })
})

describe('validateAdminPassword', () => {
  it('requires at least 4 characters', () => {
    expect(validateAdminPassword('abc')).not.toBeNull()
    expect(validateAdminPassword('secret')).toBeNull()
  })
})
