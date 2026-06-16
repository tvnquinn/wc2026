import { describe, expect, it } from 'vitest'
import { formatMatchNumLabel } from './formatMatchNum'

describe('formatMatchNumLabel', () => {
  it('prefixes plain numbers with M', () => {
    expect(formatMatchNumLabel('17')).toBe('M17')
  })

  it('keeps existing M prefix', () => {
    expect(formatMatchNumLabel('M17')).toBe('M17')
  })

  it('returns empty for missing values', () => {
    expect(formatMatchNumLabel(null)).toBe('')
    expect(formatMatchNumLabel('')).toBe('')
  })
})
