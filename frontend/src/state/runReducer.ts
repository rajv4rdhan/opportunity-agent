import type { Event, FinalReport } from '@/api/types'
import { domainOf, normalizeUrl } from '@/lib/url'
import { AGENTS, EDGES, HANDOFF_LABELS, PHASES, PHASE_INDEX, PHASE_OF_AGENT, edgeId } from '@/swarm/agents'

export const MAX_EVENTS = 500
export const THOUGHT_CHARS = 90
export const ACTIVE_TICKS = 5
export const TERMINAL = new Set(['done', 'skipped', 'failed'])

export interface Worker {
  key: string
  url: string
  domain: string
  title: string
  state: string
  message: string
  reason: string
  flashUntil: number
}

export interface Handoff {
  src: string
  dst: string
  label: string
  atEventId: number
}

export interface Candidate {
  title: string
  url: string
  provider: string
  official: boolean
}

export interface RunStats {
  agentsRun: number
  llmCalls: number
  toolCalls: number
  retries: number
  fallbacks: number
  errors: number
  pagesRead: number
  durationSec: number
  estCostUsd: number
}

export interface RunState {
  runId: string
  status: string
  lastEventId: number
  agentStatus: Record<string, string>
  startedAgents: string[]
  verifiersStarted: number
  verifiersDone: number
  events: Event[]
  candidates: Candidate[]
  liveViewUrl: string | null
  interrupt: Record<string, unknown> | null
  stats: RunStats
  graphVersion: number
  finished: boolean
  report: FinalReport | null
  studentName: string | null
  startedAt: string | null

  phase: string | null
  phaseDone: string[]
  thoughts: Record<string, string>
  workers: Record<string, Worker>
  handoffs: Handoff[]
  activeEdges: string[]
  traversedEdges: string[]
  edgeUntil: Record<string, number>
  profileSnapshot: Record<string, unknown> | null
  tick: number

  lastFinishedAgent: string | null
  lastFinishedData: Record<string, unknown>
  lastFinishedEventId: number
  recentFinished: Array<[string, Record<string, unknown>, number]>
}

export function initialStats(): RunStats {
  return {
    agentsRun: 0,
    llmCalls: 0,
    toolCalls: 0,
    retries: 0,
    fallbacks: 0,
    errors: 0,
    pagesRead: 0,
    durationSec: 0,
    estCostUsd: 0,
  }
}

export function initialRunState(runId: string, status = 'queued'): RunState {
  return {
    runId,
    status,
    lastEventId: 0,
    agentStatus: Object.fromEntries(AGENTS.map((agent) => [agent.id, 'idle'])),
    startedAgents: [],
    verifiersStarted: 0,
    verifiersDone: 0,
    events: [],
    candidates: [],
    liveViewUrl: null,
    interrupt: null,
    stats: initialStats(),
    graphVersion: 0,
    finished: false,
    report: null,
    studentName: null,
    startedAt: null,
    phase: null,
    phaseDone: [],
    thoughts: {},
    workers: {},
    handoffs: [],
    activeEdges: [],
    traversedEdges: [],
    edgeUntil: {},
    profileSnapshot: null,
    tick: 0,
    lastFinishedAgent: null,
    lastFinishedData: {},
    lastFinishedEventId: 0,
    recentFinished: [],
  }
}

function copyState(state: RunState): RunState {
  return {
    ...state,
    agentStatus: { ...state.agentStatus },
    startedAgents: [...state.startedAgents],
    events: [...state.events],
    candidates: [...state.candidates],
    stats: { ...state.stats },
    phaseDone: [...state.phaseDone],
    thoughts: { ...state.thoughts },
    workers: Object.fromEntries(
      Object.entries(state.workers).map(([key, worker]) => [key, { ...worker }]),
    ),
    handoffs: [...state.handoffs],
    activeEdges: [...state.activeEdges],
    traversedEdges: [...state.traversedEdges],
    edgeUntil: { ...state.edgeUntil },
    lastFinishedData: { ...state.lastFinishedData },
    recentFinished: state.recentFinished.map(([agent, data, id]) => [agent, { ...data }, id]),
  }
}

export function trimMessage(message: unknown): string {
  return String(message ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
    .slice(0, THOUGHT_CHARS)
}

function dataOf(event: Event): Record<string, unknown> {
  return event.data ?? {}
}

function setThought(state: RunState, agent: string, message: unknown, worker?: string): void {
  if (!agent) return
  const thought = trimMessage(message)
  state.thoughts[agent] = thought
  if (worker && state.workers[worker]) state.workers[worker].message = thought
}

function workerFor(state: RunState, event: Event, create = true): Worker | null {
  const data = dataOf(event)
  const key = String(data.worker ?? '')
  if (!key) return null
  let worker = state.workers[key]
  if (!worker && create) {
    const url = String(data.url ?? '')
    worker = {
      key,
      url,
      domain: String(data.domain ?? domainOf(url) ?? key),
      title: String(data.title ?? ''),
      state: 'queued',
      message: '',
      reason: '',
      flashUntil: 0,
    }
    state.workers[key] = worker
  }
  if (worker) {
    if (data.title && !worker.title) worker.title = String(data.title)
    if (data.domain && !worker.domain) worker.domain = String(data.domain)
    if (data.url && !worker.url) worker.url = String(data.url)
  }
  return worker ?? null
}

function handoffLabel(agent: string, data: Record<string, unknown>, destination: string): string {
  const counts = (data.counts ?? {}) as Record<string, number>
  for (const [key, template] of Object.entries(HANDOFF_LABELS)) {
    if (key in counts) return template.replace('{n}', String(counts[key]))
  }
  const updated = (data.updated ?? []) as string[]
  if (updated.includes('profile')) return 'profile'
  if (updated.includes('github')) return 'GitHub insights'
  if (agent === 'supervisor') return destination === 'planner' ? 're-planning' : 'ready'
  return ''
}

function refreshEdges(state: RunState): void {
  const active = new Set<string>()
  for (const edge of EDGES) {
    if (state.agentStatus[edge.target] === 'running') active.add(edgeId(edge.source, edge.target))
  }
  for (const [id, until] of Object.entries(state.edgeUntil)) {
    if (until < state.tick) delete state.edgeUntil[id]
    else active.add(id)
  }
  state.activeEdges = [...active]
}

function updatePhases(state: RunState): void {
  if (state.finished && state.status === 'finished') {
    state.phase = PHASES[PHASES.length - 1]?.id ?? 'write'
    state.phaseDone = PHASES.map((phase) => phase.id)
    return
  }

  const startedPhases = PHASES.map((phase, index) => ({ phase, index }))
    .filter(({ phase }) => phase.agents.some((agent) => state.startedAgents.includes(agent)))
    .map(({ index }) => index)

  if (startedPhases.length === 0) {
    state.phase = null
    state.phaseDone = []
    return
  }

  const running = Object.entries(state.agentStatus)
    .filter(([agent, status]) => status === 'running' && agent in PHASE_OF_AGENT)
    .map(([agent]) => PHASE_INDEX[PHASE_OF_AGENT[agent] as keyof typeof PHASE_INDEX])
  const waiting = Object.entries(state.agentStatus)
    .filter(([agent, status]) => status === 'waiting' && agent in PHASE_OF_AGENT)
    .map(([agent]) => PHASE_INDEX[PHASE_OF_AGENT[agent] as keyof typeof PHASE_INDEX])

  const current = waiting.length
    ? waiting[waiting.length - 1]
    : running.length
      ? Math.max(...running)
      : startedPhases[startedPhases.length - 1]
  state.phase = PHASES[current]?.id ?? null

  const done = new Set<string>()
  PHASES.forEach((phase, index) => {
    const agents = phase.agents.filter((agent) => state.startedAgents.includes(agent))
    if (agents.length === 0) return
    const terminal = agents.every((agent) => TERMINAL.has(state.agentStatus[agent] ?? 'idle'))
    const laterStarted = PHASES.slice(index + 1).some((later) =>
      later.agents.some((agent) => state.startedAgents.includes(agent)),
    )
    if (terminal && laterStarted) done.add(phase.id)
  })
  state.phaseDone = [...done]
}

function secondsBetween(start: string | null, end: string): number {
  if (!start) return 0
  const value = (Date.parse(end) - Date.parse(start)) / 1000
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : 0
}

export function reduceEvent(state: RunState, event: Event): RunState {
  const next = copyState(state)
  next.tick += 1
  next.lastEventId = Math.max(next.lastEventId, event.id ?? 0)
  next.events.push(event)
  if (next.events.length > MAX_EVENTS) {
    next.events = next.events.slice(next.events.length - MAX_EVENTS)
  }
  next.startedAt = next.startedAt ?? event.ts

  const data = dataOf(event)
  const kind = event.type
  const agent = event.agent ?? ''

  if (kind === 'run_started') {
    next.status = 'running'
    next.phase = next.phase ?? 'understand'
  } else if (kind === 'agent_started') {
    next.agentStatus[agent] = 'running'
    if (!next.startedAgents.includes(agent)) next.startedAgents.push(agent)
    next.stats.agentsRun += 1
    if (agent === 'verifier') {
      next.verifiersStarted += 1
      const worker = workerFor(next, event)
      if (worker) {
        worker.state = 'fetching'
        worker.message = 'Starting'
      }
    }
    for (let index = next.recentFinished.length - 1; index >= 0; index -= 1) {
      const [source, sourceData, sourceEventId] = next.recentFinished[index]
      const connected = EDGES.some((edge) => edge.source === source && edge.target === agent)
      if (!connected) continue
      const label = handoffLabel(source, sourceData, agent)
      next.handoffs.push({ src: source, dst: agent, label, atEventId: sourceEventId })
      const id = edgeId(source, agent)
      next.edgeUntil[id] = next.tick + ACTIVE_TICKS
      if (!next.traversedEdges.includes(id)) next.traversedEdges.push(id)
      next.recentFinished.splice(index, 1)
      break
    }
  } else if (kind === 'agent_finished') {
    next.agentStatus[agent] = 'done'
    if (data.student_name) next.studentName = String(data.student_name)
    const preview = data.profile_preview
    if (preview && typeof preview === 'object' && !Array.isArray(preview)) {
      next.profileSnapshot = {
        ...(next.profileSnapshot ?? {}),
        ...(preview as Record<string, unknown>),
      }
    }
    if (agent === 'verifier') next.verifiersDone += 1
    next.lastFinishedAgent = agent
    next.lastFinishedData = { ...data }
    next.lastFinishedEventId = event.id ?? 0
    next.recentFinished.push([agent, { ...data }, event.id ?? 0])
    if (next.recentFinished.length > 8) next.recentFinished.shift()
  } else if (kind === 'agent_failed') {
    next.agentStatus[agent] = 'failed'
    next.stats.errors += 1
    if (agent === 'verifier') {
      const worker = workerFor(next, event, false)
      if (worker) {
        worker.state = 'failed'
        worker.message = trimMessage(event.message)
      } else {
        for (const item of Object.values(next.workers)) {
          if (item.state === 'fetching' || item.state === 'reading') {
            item.state = 'failed'
            item.message = 'Verifier failed'
          }
        }
      }
    }
  } else if (kind === 'agent_skipped') {
    next.agentStatus[agent] = 'skipped'
  } else if (kind === 'tool_call') {
    next.stats.toolCalls += 1
    const label = String(data.label ?? '')
    if (label === 'llm') next.stats.llmCalls += 1
    setThought(next, agent, event.message, String(data.worker ?? ''))
    const worker = workerFor(next, event, false)
    if (worker) {
      if (label.startsWith('fetch')) {
        worker.state = 'fetching'
        worker.message = `Fetching via ${String(data.provider ?? 'provider')}`
      } else if (label === 'llm') {
        worker.state = 'reading'
        worker.message = 'Reading the page'
      }
    }
  } else if (kind === 'tool_result') {
    const worker = workerFor(next, event, false)
    if (worker && String(data.label ?? '').startsWith('fetch')) {
      worker.state = 'reading'
      worker.message = 'Reading the page'
    }
  } else if (kind === 'log') {
    const pages = data.pages_read
    if (typeof pages === 'number') next.stats.pagesRead += pages
    setThought(next, agent, event.message, String(data.worker ?? ''))
  } else if (kind === 'retry') {
    next.stats.retries += 1
  } else if (kind === 'fallback') {
    next.stats.fallbacks += 1
    const worker = workerFor(next, event, false)
    if (worker) {
      worker.flashUntil = next.tick + 2
      worker.message = trimMessage(event.message)
    }
    setThought(next, agent, event.message, String(data.worker ?? ''))
  } else if (kind === 'chaos_injected') {
    // Visible in the activity feed only.
  } else if (kind === 'tool_error') {
    next.stats.errors += 1
    const worker = workerFor(next, event, false)
    if (worker) {
      worker.state = 'failed'
      worker.message = trimMessage(event.message)
    }
  } else if (kind === 'decision') {
    setThought(next, agent, event.message, String(data.worker ?? ''))
  } else if (kind === 'run_finished') {
    next.finished = true
    next.status = 'finished'
    next.liveViewUrl = null
    next.stats.durationSec = secondsBetween(next.startedAt, event.ts)
  } else if (kind === 'run_failed') {
    next.finished = true
    next.status = 'failed'
    next.liveViewUrl = null
    next.stats.errors += 1
    next.stats.durationSec = secondsBetween(next.startedAt, event.ts)
  } else if (kind === 'interrupt') {
    next.interrupt = data as Record<string, unknown>
    next.status = 'waiting_input'
    next.agentStatus.clarifier = 'waiting'
    if (!next.startedAgents.includes('clarifier')) next.startedAgents.push('clarifier')
  } else if (kind === 'resumed') {
    next.interrupt = null
    next.status = 'running'
    next.agentStatus.clarifier = 'running'
  } else if (kind === 'browser_live_view') {
    next.liveViewUrl = data.url ? String(data.url) : null
  } else if (kind === 'graph_update') {
    next.graphVersion += 1
  } else if (kind === 'candidate_found') {
    const url = String(data.url ?? '')
    const title = String(data.title ?? event.message)
    next.candidates.push({
      title,
      url,
      provider: String(data.provider ?? ''),
      official: Boolean(data.official),
    })
    const key = normalizeUrl(url) || url
    if (key && !next.workers[key]) {
      next.workers[key] = {
        key,
        url,
        domain: domainOf(url) || key,
        title,
        state: 'queued',
        message: 'Queued',
        reason: '',
        flashUntil: 0,
      }
    }
  } else if (kind === 'opportunity_verified') {
    const worker = workerFor(next, event, false)
    if (worker) {
      worker.state = 'verified'
      worker.message = trimMessage(data.name ?? event.message)
      worker.flashUntil = 0
    }
  } else if (kind === 'opportunity_rejected') {
    const worker = workerFor(next, event, false)
    if (worker) {
      worker.state = 'rejected'
      worker.reason = String(data.reason ?? event.message)
      worker.message = trimMessage(worker.reason)
    }
  }

  updatePhases(next)
  refreshEdges(next)
  return next
}

/** Advance time-based state (edge labels expiring, fallback flashes) without an event. */
export function advanceTick(state: RunState): RunState {
  const next = copyState(state)
  next.tick += 1
  refreshEdges(next)
  return next
}

export function workerSummary(state: RunState): Record<string, number> {
  const counts: Record<string, number> = {
    queued: 0,
    fetching: 0,
    reading: 0,
    verified: 0,
    rejected: 0,
    failed: 0,
  }
  for (const worker of Object.values(state.workers)) {
    counts[worker.state] = (counts[worker.state] ?? 0) + 1
  }
  return counts
}

export function phaseLabel(phaseId: string | null): string {
  if (!phaseId) return 'Starting'
  return PHASES.find((phase) => phase.id === phaseId)?.label ?? phaseId
}

export function handoffFor(state: RunState, source: string, target: string): Handoff | undefined {
  return [...state.handoffs].reverse().find((handoff) => handoff.src === source && handoff.dst === target)
}
