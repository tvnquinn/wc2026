import { describe, expect, it } from 'vitest'
import {
  isGlobalScorerLeague,
  validateAdminPassword,
  validateLeagueName,
  validateSlug,
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
    expect(validateLeagueName('Family Pool')).toBeNull()
  })
})

describe('validateAdminPassword', () => {
  it('requires at least 4 characters', () => {
    expect(validateAdminPassword('abc')).not.toBeNull()
    expect(validateAdminPassword('secret')).toBeNull()
  })
})
