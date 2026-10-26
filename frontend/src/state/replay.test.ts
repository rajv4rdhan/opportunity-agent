import { describe, expect, it } from 'vitest'

import { replayDelays } from './useReplay'

const BASE = Date.parse('2026-10-24T12:00:00Z')
const at = (seconds: number) => new Date(BASE + seconds * 1000).toISOString()

describe('replayDelays', () => {
  it('scales gaps by speed and caps idle waits', () => {
    const timestamps = [at(0), at(2), at(4), at(400)]
    expect(replayDelays(timestamps, 1)).toEqual([0, 1500, 1500, 1500])
    expect(replayDelays(timestamps, 20)).toEqual([0, 100, 100, 1500])
    expect(replayDelays(timestamps, 100, 500)).toEqual([0, 20, 20, 500])
  })

  it('handles empty and single-event streams', () => {
    expect(replayDelays([])).toEqual([])
    expect(replayDelays([at(0)])).toEqual([0])
  })

  it('never sleeps for out-of-order timestamps', () => {
    expect(replayDelays([at(0), at(2), at(1)], 1)).toEqual([0, 1500, 0])
  })
})
