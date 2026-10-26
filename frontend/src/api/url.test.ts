import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiBase, apiUrl } from './url'

describe('apiUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('stays relative when VITE_API_BASE is unset', () => {
    vi.stubEnv('VITE_API_BASE', '')

    expect(apiBase()).toBe('')
    expect(apiUrl('/api/meta')).toBe('/api/meta')
  })

  it('prefixes requests with the configured backend URL', () => {
    vi.stubEnv('VITE_API_BASE', 'https://api.example.com')

    expect(apiUrl('/api/meta')).toBe('https://api.example.com/api/meta')
  })

  it('normalizes whitespace and trailing slashes', () => {
    vi.stubEnv('VITE_API_BASE', '  https://api.example.com///  ')

    expect(apiBase()).toBe('https://api.example.com')
    expect(apiUrl('/api/runs')).toBe('https://api.example.com/api/runs')
  })
})
