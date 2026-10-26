import { describe, expect, it } from 'vitest'

import type { Event } from '@/api/types'
import {
  advanceTick,
  initialRunState,
  reduceEvent,
  type RunState,
} from './runReducer'

const BASE = Date.parse('2026-10-24T12:00:00Z')

function event(
  index: number,
  type: Event['type'],
  agent?: string,
  data?: Record<string, unknown>,
  message?: string,
  fields: Record<string, unknown> = {},
): Event {
  return {
    id: index,
    run_id: 'run1',
    ts: new Date(BASE + index * 1000).toISOString(),
    type,
    agent: agent ?? null,
    message: message ?? type,
    data: { ...(data ?? {}), ...fields },
  }
}

function apply(state: RunState, ...events: Event[]): RunState {
  return events.reduce((current, item) => reduceEvent(current, item), state)
}

describe('runReducer', () => {
  it('tracks agent status and verifier counters', () => {
    let state = initialRunState('run1')
    state = apply(state, event(1, 'agent_started', 'verifier'))
    expect(state.agentStatus.verifier).toBe('running')
    expect(state.verifiersStarted).toBe(1)

    state = apply(state, event(2, 'agent_finished', 'verifier'))
    expect(state.agentStatus.verifier).toBe('done')
    expect(state.verifiersDone).toBe(1)
    expect(state.stats.agentsRun).toBe(1)
  })

  it('carries the profile name to the header', () => {
    const state = apply(
      initialRunState('run1'),
      event(1, 'agent_finished', 'profile_analyst', undefined, undefined, {
        student_name: 'Test Student',
      }),
    )
    expect(state.studentName).toBe('Test Student')
  })

  it('handles interrupt and resume', () => {
    const payload = {
      questions: [{ field: 'nationality', question: 'Nationality?', type: 'text' }],
    }
    let state = apply(initialRunState('run1'), event(1, 'interrupt', undefined, payload))
    expect(state.interrupt).toEqual(payload)
    expect(state.status).toBe('waiting_input')

    state = apply(state, event(2, 'resumed'))
    expect(state.interrupt).toBeNull()
    expect(state.status).toBe('running')
  })

  it('sets duration and clears the browser on finish', () => {
    let state = apply(
      initialRunState('run1'),
      event(1, 'run_started'),
      event(2, 'browser_live_view', undefined, { url: 'https://live.example' }),
    )
    expect(state.liveViewUrl).toBe('https://live.example')

    state = apply(state, event(9, 'run_finished'))
    expect(state.finished).toBe(true)
    expect(state.status).toBe('finished')
    expect(state.stats.durationSec).toBe(8)
    expect(state.liveViewUrl).toBeNull()
  })

  it('tracks candidates, the browser and the graph version', () => {
    const state = apply(
      initialRunState('run1'),
      event(1, 'candidate_found', undefined, {
        title: 'X',
        url: 'https://x.edu',
        provider: 'exa',
      }),
      event(2, 'browser_live_view', undefined, { url: 'https://live.example' }),
      event(3, 'graph_update', undefined, { opportunities: 3 }),
    )
    expect(state.candidates[0]?.url).toBe('https://x.edu')
    expect(state.liveViewUrl).toBe('https://live.example')
    expect(state.graphVersion).toBe(1)
  })

  it('counts failures, fallbacks and retries', () => {
    let state = apply(initialRunState('run1'), event(1, 'agent_failed', 'scout'))
    state = apply(state, event(2, 'fallback'), event(3, 'retry'))
    expect(state.stats.errors).toBe(1)
    expect(state.stats.fallbacks).toBe(1)
    expect(state.stats.retries).toBe(1)
  })

  it('marks failed runs finished and clears the browser', () => {
    const state = apply(
      initialRunState('run1'),
      event(1, 'run_started'),
      event(2, 'browser_live_view', undefined, { url: 'https://live.example' }),
      event(3, 'run_failed'),
    )
    expect(state.finished).toBe(true)
    expect(state.status).toBe('failed')
    expect(state.stats.errors).toBe(1)
    expect(state.liveViewUrl).toBeNull()
  })

  it('moves verifier workers through the pool', () => {
    let state = apply(
      initialRunState('run1'),
      event(1, 'candidate_found', 'scout', { title: 'DAAD', url: 'https://www.daad.de/x' }),
    )
    expect(state.workers['https://daad.de/x']?.state).toBe('queued')

    state = apply(
      state,
      event(2, 'agent_started', 'verifier', {
        worker: 'https://daad.de/x',
        title: 'DAAD',
        domain: 'daad.de',
      }),
    )
    expect(state.workers['https://daad.de/x']?.state).toBe('fetching')

    state = apply(
      state,
      event(3, 'tool_call', 'verifier', {
        worker: 'https://daad.de/x',
        label: 'fetch',
        provider: 'jina',
      }),
    )
    expect(state.workers['https://daad.de/x']?.state).toBe('fetching')

    state = apply(
      state,
      event(4, 'tool_result', 'verifier', { worker: 'https://daad.de/x', label: 'fetch' }),
    )
    expect(state.workers['https://daad.de/x']?.state).toBe('reading')

    state = apply(
      state,
      event(5, 'fallback', 'verifier', { worker: 'https://daad.de/x', label: 'fetch' }),
    )
    expect(state.workers['https://daad.de/x']?.state).toBe('reading')
    expect(state.workers['https://daad.de/x']?.flashUntil).toBe(state.tick + 2)

    state = apply(
      state,
      event(6, 'opportunity_verified', 'verifier', {
        worker: 'https://daad.de/x',
        name: 'DAAD EPOS',
      }),
    )
    const worker = state.workers['https://daad.de/x']
    expect(worker?.state).toBe('verified')
    expect(worker?.message).toBe('DAAD EPOS')
  })

  it('keeps the reason on a rejected worker', () => {
    const state = apply(
      initialRunState('run1'),
      event(1, 'candidate_found', 'scout', { url: 'https://x.edu' }),
      event(2, 'opportunity_rejected', 'verifier', {
        worker: 'https://x.edu',
        reason: 'IELTS 7.5 required',
      }),
    )
    const worker = state.workers['https://x.edu']
    expect(worker?.state).toBe('rejected')
    expect(worker?.reason).toContain('IELTS')
  })

  it('uses counts for hand-offs and expires active edges', () => {
    let state = apply(
      initialRunState('run1'),
      event(1, 'run_started'),
      event(2, 'agent_finished', 'scout', {
        counts: { candidates: 7, pending_verify: 7 },
        updated: ['candidates', 'pending_verify'],
      }),
      event(3, 'agent_started', 'verifier'),
    )

    const handoff = state.handoffs[state.handoffs.length - 1]
    expect([handoff?.src, handoff?.dst, handoff?.label]).toEqual([
      'scout',
      'verifier',
      '7 candidates',
    ])
    expect(state.activeEdges).toContain('scout->verifier')
    expect(state.traversedEdges).toContain('scout->verifier')

    state = apply(
      state,
      event(4, 'agent_finished', 'verifier'),
      ...[5, 6, 7, 8, 9, 10].map((index) =>
        event(index, 'tool_result', 'verifier'),
      ),
    )
    expect(state.activeEdges).not.toContain('scout->verifier')
  })

  it('advances phases only after a later phase starts', () => {
    let state = apply(initialRunState('run1'), event(1, 'agent_started', 'profile_analyst'))
    expect(state.phase).toBe('understand')

    state = apply(state, event(2, 'agent_finished', 'profile_analyst'))
    expect(state.phaseDone).not.toContain('understand')

    state = apply(state, event(3, 'agent_started', 'planner'))
    expect(state.phase).toBe('plan')
    expect(state.phaseDone).toContain('understand')

    state = apply(state, event(4, 'run_finished'))
    expect(state.phase).toBe('write')
    expect(state.phaseDone).toEqual([
      'understand',
      'plan',
      'research',
      'verify',
      'decide',
      'write',
    ])
  })

  it('trims thoughts and stores the profile snapshot', () => {
    let state = apply(
      initialRunState('run1'),
      event(1, 'log', 'planner', undefined, 'x'.repeat(200)),
    )
    expect(state.thoughts.planner).toHaveLength(90)

    const preview = { name: 'Rahul', skills: ['python'] }
    state = apply(
      state,
      event(2, 'agent_finished', 'profile_analyst', undefined, undefined, {
        profile_preview: preview,
      }),
    )
    expect(state.profileSnapshot).toEqual(preview)
  })

  it('is deterministic for the same event stream', () => {
    const events = [
      event(1, 'run_started'),
      event(2, 'agent_started', 'scout'),
      event(3, 'candidate_found', 'scout', { url: 'https://a.edu', title: 'A' }),
      event(4, 'agent_finished', 'scout', { counts: { candidates: 1 } }),
      event(5, 'agent_started', 'verifier', { worker: 'https://a.edu' }),
      event(6, 'opportunity_verified', 'verifier', { worker: 'https://a.edu', name: 'A' }),
      event(7, 'run_finished'),
    ]
    const first = apply(initialRunState('run1'), ...events)
    const second = apply(initialRunState('run1'), ...events)

    expect(first.phase).toBe(second.phase)
    expect(first.phaseDone).toEqual(second.phaseDone)
    expect(first.handoffs).toEqual(second.handoffs)
    expect(first.activeEdges).toEqual(second.activeEdges)
    expect(
      Object.fromEntries(Object.entries(first.workers).map(([key, worker]) => [key, worker.state])),
    ).toEqual(
      Object.fromEntries(Object.entries(second.workers).map(([key, worker]) => [key, worker.state])),
    )
  })

  it('expires fallback flashes on a tick', () => {
    let state = apply(
      initialRunState('run1'),
      event(1, 'candidate_found', 'scout', { url: 'https://a.edu' }),
      event(2, 'fallback', 'verifier', { worker: 'https://a.edu', label: 'fetch' }),
    )
    const flashUntil = state.workers['https://a.edu']?.flashUntil ?? 0
    state = advanceTick(state)
    state = advanceTick(state)
    state = advanceTick(state)
    expect(state.tick).toBeGreaterThanOrEqual(flashUntil + 1)
  })
})
