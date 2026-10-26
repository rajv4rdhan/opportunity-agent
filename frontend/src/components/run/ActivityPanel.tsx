import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeftRight,
  Brain,
  Check,
  CheckCircle2,
  Circle,
  Globe,
  HelpCircle,
  Network,
  Play,
  RotateCcw,
  Search,
  SkipForward,
  StickyNote,
  Wrench,
  XCircle,
  Zap,
} from 'lucide-react'

import type { Event } from '@/api/types'
import { Panel } from '@/components/common/Panel'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/cn'
import { AGENTS, AGENT_BY_ID, IMPORTANT_EVENTS } from '@/swarm/agents'
import type { RunState } from '@/state/runReducer'

const ICONS = {
  fallback: ArrowLeftRight,
  retry: RotateCcw,
  chaos_injected: Zap,
  tool_error: AlertCircle,
  agent_failed: AlertCircle,
  run_failed: XCircle,
  decision: Brain,
  interrupt: HelpCircle,
  resumed: Play,
  opportunity_verified: CheckCircle2,
  opportunity_rejected: XCircle,
  tool_call: Wrench,
  tool_result: Check,
  candidate_found: Search,
  graph_update: Network,
  browser_live_view: Globe,
  agent_started: Play,
  agent_finished: Check,
  agent_skipped: SkipForward,
  run_started: Play,
  run_finished: CheckCircle2,
  log: StickyNote,
}

const TONE_BORDER: Record<string, string> = {
  warn: 'border-l-2 border-warn bg-warn-soft/30 pl-2',
  err: 'border-l-2 border-err bg-err-soft/30 pl-2',
  accent: 'border-l-2 border-accent bg-accent-soft/30 pl-2',
}

export function ActivityPanel({
  state,
  title = true,
}: {
  state: RunState
  title?: boolean
}) {
  const [mode, setMode] = useState<'important' | 'all'>('important')
  const [agent, setAgent] = useState('all')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [atBottom, setAtBottom] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const events = useMemo(() => {
    return state.events.filter((event) => {
      if (mode === 'important' && !IMPORTANT_EVENTS.has(event.type)) return false
      return agent === 'all' || (event.agent ?? 'run') === agent
    })
  }, [state.events, mode, agent])

  useEffect(() => {
    if (!atBottom) return
    const element = scrollRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [events.length, atBottom])

  function resetScroll() {
    setAtBottom(true)
    requestAnimationFrame(() => {
      const element = scrollRef.current
      if (element) element.scrollTop = element.scrollHeight
    })
  }

  const body = (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        className="ss-scroll h-full overflow-y-auto px-5 py-3"
        onScroll={(event) => {
          const element = event.currentTarget
          setAtBottom(element.scrollHeight - element.scrollTop - element.clientHeight <= 48)
        }}
      >
        {events.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No activity yet.</p>
        ) : (
          events.map((event) => (
            <ActivityRow
              key={event.id ?? `${event.type}-${event.ts}-${event.message}`}
              event={event}
              startedAt={state.startedAt}
              expanded={expanded.has(event.id ?? -1)}
              onToggle={() => {
                if (event.id === null || event.id === undefined) return
                setExpanded((current) => {
                  const next = new Set(current)
                  if (next.has(event.id as number)) next.delete(event.id as number)
                  else next.add(event.id as number)
                  return next
                })
              }}
            />
          ))
        )}
      </div>
      {!atBottom ? (
        <button
          type="button"
          onClick={resetScroll}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-muted shadow-card"
        >
          Jump to latest
        </button>
      ) : null}
    </div>
  )

  const controls = (
    <>
      <ToggleGroup
        type="single"
        value={mode}
        onValueChange={(value) => {
          if (!value) return
          setMode(value as 'important' | 'all')
          resetScroll()
        }}
        className="h-8"
      >
        <ToggleGroupItem value="important" className="h-7 px-2 text-xs">
          Important
        </ToggleGroupItem>
        <ToggleGroupItem value="all" className="h-7 px-2 text-xs">
          All
        </ToggleGroupItem>
      </ToggleGroup>
      <Select
        value={agent}
        onValueChange={(value) => {
          setAgent(value)
          resetScroll()
        }}
      >
        <SelectTrigger className="h-8 w-[140px] text-xs" aria-label="Filter by agent">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All agents</SelectItem>
          {AGENTS.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )

  return (
    <Panel
      title={title ? 'Activity' : undefined}
      actions={title ? controls : undefined}
      flush
      className="overflow-hidden"
    >
      <div className="flex h-full min-h-0 flex-col">
        {!title ? (
          <div className="flex flex-wrap items-center justify-end gap-2 px-5 pt-3">
            {controls}
          </div>
        ) : null}
        <div className="min-h-0 flex-1">{body}</div>
      </div>
    </Panel>
  )
}

function ActivityRow({
  event,
  startedAt,
  expanded,
  onToggle,
}: {
  event: Event
  startedAt: string | null
  expanded: boolean
  onToggle: () => void
}) {
  const Icon = ICONS[event.type as keyof typeof ICONS] ?? Circle
  const tone = eventTone(event)
  const time = startedAt
    ? Math.max(0, Math.floor((Date.parse(event.ts) - Date.parse(startedAt)) / 1000))
    : 0
  const agent = AGENT_BY_ID[event.agent ?? '']?.label ?? (event.agent ? event.agent.replaceAll('_', ' ') : 'Run')
  const url = typeof event.data?.url === 'string' ? event.data.url : undefined

  return (
    <div
      className={cn(
        'grid grid-cols-[44px_20px_1fr] gap-2 border-b border-line/60 py-2',
        TONE_BORDER[tone ?? ''] ?? '',
      )}
    >
      <span className="font-mono text-[11px] leading-6 text-muted tabular-nums">
        {String(Math.floor(time / 60)).padStart(2, '0')}:{String(time % 60).padStart(2, '0')}
      </span>
      <span
        className={cn(
          'mt-1 flex size-5 items-center justify-center rounded-full bg-subtle',
          tone === 'warn' && 'bg-warn-soft text-warn',
          tone === 'err' && 'bg-err-soft text-err',
          tone === 'accent' && 'bg-accent-soft text-accent',
          tone === 'ok' && 'bg-ok-soft text-ok',
          !tone && 'text-muted',
        )}
      >
        <Icon className="size-3" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold">{agent}</span>
          <span className="text-[11px] tracking-wide text-muted uppercase">
            {event.type.replaceAll('_', ' ')}
          </span>
        </p>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'mt-0.5 w-full text-left text-[13px] leading-5',
            !expanded && 'line-clamp-2',
          )}
        >
          {event.message}
        </button>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-xs text-accent"
          >
            {url}
          </a>
        ) : null}
      </div>
    </div>
  )
}

function eventTone(event: Event): 'warn' | 'err' | 'accent' | 'ok' | undefined {
  if (['fallback', 'retry', 'chaos_injected', 'interrupt'].includes(event.type)) return 'warn'
  if (['agent_failed', 'tool_error', 'run_failed'].includes(event.type)) return 'err'
  if (['decision', 'resumed', 'tool_call', 'tool_result', 'agent_started'].includes(event.type)) {
    return 'accent'
  }
  if (['opportunity_verified', 'agent_finished', 'run_finished', 'graph_update'].includes(event.type)) {
    return 'ok'
  }
  return undefined
}
