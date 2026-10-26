import { useEffect, useReducer, useRef, useState } from 'react'

import { eventsUrl } from '@/api/client'
import type { Event } from '@/api/types'
import { advanceTick, initialRunState, reduceEvent, type RunState } from './runReducer'

type Action =
  | { kind: 'event'; event: Event }
  | { kind: 'tick' }
  | { kind: 'reset'; state: RunState }

function reducer(state: RunState, action: Action): RunState {
  if (action.kind === 'tick') return advanceTick(state)
  if (action.kind === 'reset') return action.state
  return reduceEvent(state, action.event)
}

const FLUSH_MS = 100

export function useRunStream(runId: string): { state: RunState; connected: boolean } {
  const [state, dispatch] = useReducer(reducer, runId, initialRunState)
  const [connected, setConnected] = useState(false)
  const lastIdRef = useRef(0)
  const finishedRef = useRef(false)
  const queueRef = useRef<Event[]>([])

  useEffect(() => {
    lastIdRef.current = 0
    finishedRef.current = false
    queueRef.current = []
    dispatch({ kind: 'reset', state: initialRunState(runId) })
  }, [runId])

  useEffect(() => {
    let source: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let flushTimer: ReturnType<typeof setTimeout> | null = null
    let stopped = false
    let attempts = 0

    function flush() {
      flushTimer = null
      const pending = queueRef.current
      queueRef.current = []
      for (const event of pending) {
        lastIdRef.current = Math.max(lastIdRef.current, event.id ?? 0)
        dispatch({ kind: 'event', event })
        if (event.type === 'run_finished' || event.type === 'run_failed') {
          finishedRef.current = true
        }
      }
      if (finishedRef.current) {
        source?.close()
        setConnected(false)
      }
    }

    function scheduleFlush() {
      if (flushTimer !== null) return
      flushTimer = setTimeout(flush, FLUSH_MS)
    }

    function open() {
      if (stopped) return
      source = new EventSource(eventsUrl(runId, lastIdRef.current))
      source.onopen = () => {
        attempts = 0
        setConnected(true)
      }
      source.onmessage = (message) => {
        try {
          queueRef.current.push(JSON.parse(message.data) as Event)
          scheduleFlush()
        } catch {
          // Ignore malformed frames.
        }
      }
      source.onerror = () => {
        source?.close()
        setConnected(false)
        if (stopped || finishedRef.current) return
        const wait = Math.min(1000 * 2 ** attempts, 10_000)
        attempts += 1
        retryTimer = setTimeout(open, wait)
      }
    }

    open()

    return () => {
      stopped = true
      source?.close()
      if (retryTimer !== null) clearTimeout(retryTimer)
      if (flushTimer !== null) clearTimeout(flushTimer)
    }
  }, [runId])

  useEffect(() => {
    if (finishedRef.current) return
    const interval = setInterval(() => dispatch({ kind: 'tick' }), 3000)
    return () => clearInterval(interval)
  }, [state.finished])

  return { state, connected }
}
