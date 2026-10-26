import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'

import { toast } from 'sonner'

import { getEventsJson } from '@/api/client'
import type { Event } from '@/api/types'
import { initialRunState, reduceEvent, type RunState } from './runReducer'

export function replayDelays(
  timestamps: string[],
  speed = 1,
  capMs = 1500,
): number[] {
  if (timestamps.length === 0) return []
  const factor = Math.max(0.01, speed || 1)
  const delays = [0]
  for (let index = 1; index < timestamps.length; index += 1) {
    const previous = Date.parse(timestamps[index - 1])
    const current = Date.parse(timestamps[index])
    const gap = Math.max(0, current - previous) / factor
    delays.push(Math.min(gap, capMs))
  }
  return delays
}

type Action = { kind: 'reset'; state: RunState } | { kind: 'event'; event: Event }

function reducer(state: RunState, action: Action): RunState {
  if (action.kind === 'reset') return action.state
  return reduceEvent(state, action.event)
}

export function useReplay(
  runId: string,
  initialSpeed = 20,
): {
  state: RunState
  speed: number
  setSpeed: (speed: number) => void
  restart: () => void
  done: boolean
} {
  const [speed, setSpeedState] = useState(initialSpeed)
  const [restartKey, setRestartKey] = useState(0)
  const [done, setDone] = useState(false)
  const [state, dispatch] = useReducer(reducer, runId, initialRunState)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    dispatch({ kind: 'reset', state: initialRunState(runId) })
    setDone(false)

    getEventsJson(runId)
      .then((events: Event[]) => {
        if (cancelled) return
        dispatch({ kind: 'reset', state: initialRunState(runId) })
        const delays = replayDelays(
          events.map((event) => event.ts),
          speed,
        )
        let index = 0
        const step = () => {
          if (cancelled) return
          if (index >= events.length) {
            setDone(true)
            return
          }
          dispatch({ kind: 'event', event: events[index] })
          index += 1
          timer = setTimeout(step, delays[index] ?? 0)
        }
        step()
      })
      .catch(() => {
        if (!cancelled) {
          setDone(true)
          toast.error('Could not load the replay')
        }
      })

    return () => {
      cancelled = true
      if (timer !== null) clearTimeout(timer)
    }
  }, [runId, speed, restartKey])

  const restart = useCallback(() => {
    setDone(false)
    setRestartKey((value) => value + 1)
  }, [])

  const setSpeed = useCallback((value: number) => {
    setSpeedState(Math.max(0.1, value))
  }, [])

  return useMemo(
    () => ({ state, speed, setSpeed, restart, done }),
    [state, speed, setSpeed, restart, done],
  )
}
