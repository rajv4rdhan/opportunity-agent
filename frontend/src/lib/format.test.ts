import { describe, expect, it } from 'vitest'

import {
  daysUntil,
  formatClock,
  formatDate,
  formatDuration,
  formatMoney,
  initials,
  shortId,
} from './format'

describe('format helpers', () => {
  it('formats elapsed clocks with two digits', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(97)).toBe('01:37')
    expect(formatClock(612)).toBe('10:12')
    expect(formatClock(null)).toBe('00:00')
  })

  it('formats human durations', () => {
    expect(formatDuration(42)).toBe('42s')
    expect(formatDuration(612)).toBe('10m 12s')
    expect(formatDuration(undefined)).toBe('0s')
  })

  it('formats money and ids', () => {
    expect(formatMoney(0.04)).toBe('$0.04')
    expect(formatMoney(undefined)).toBe('$0.00')
    expect(shortId('4b80b7d7dead')).toBe('4b80b7d7')
    expect(shortId(null)).toBe('')
  })

  it('formats dates and leftovers', () => {
    const date = new Date(2026, 10, 15)
    expect(formatDate(date)).toBe('15 Nov 2026')
    expect(formatDate(null)).toBe('—')
    expect(daysUntil(date)).not.toBeNull()
  })

  it('builds initials', () => {
    expect(initials('Rahul Sharma')).toBe('RS')
    expect(initials('Priya')).toBe('P')
    expect(initials(null)).toBe('?')
  })
})
