import { CheckCircle2, Circle, Hand, MinusCircle, XCircle } from 'lucide-react'

import { StatusPill } from '@/components/common/StatusPill'
import { cn } from '@/lib/cn'
import { AGENT_BY_ID } from '@/swarm/agents'
import type { RunState } from '@/state/runReducer'

const ORDER = [
  'profile_analyst',
  'clarifier',
  'github_enricher',
  'planner',
  'scout',
  'verifier',
  'matcher',
  'supervisor',
  'ranker',
  'sop_writer',
  'critic',
  'finalizer',
]

const ICONS = {
  done: CheckCircle2,
  failed: XCircle,
  waiting: Hand,
  skipped: MinusCircle,
  running: Circle,
  idle: Circle,
}

const TILE = {
  idle: 'bg-subtle text-muted',
  running: 'bg-accent-soft text-accent',
  done: 'bg-ok-soft text-ok',
  failed: 'bg-err-soft text-err',
  waiting: 'bg-warn-soft text-warn',
  skipped: 'bg-subtle text-muted',
}

export function MobileTimeline({ state }: { state: RunState }) {
  return (
    <div className="flex flex-col">
      {ORDER.map((agentId, index) => {
        const agent = AGENT_BY_ID[agentId]
        if (!agent) return null
        const status = state.agentStatus[agentId] ?? 'idle'
        const Icon = agent.icon
        const StatusIcon = ICONS[status as keyof typeof ICONS] ?? Circle
        const workers = agentId === 'verifier' ? Object.values(state.workers).slice(0, 6) : []
        return (
          <div key={agentId} className="relative grid grid-cols-[32px_1fr_auto] gap-3 py-3">
            {index < ORDER.length - 1 ? (
              <span
                className="absolute top-11 bottom-0 left-4 w-px bg-line"
                aria-hidden="true"
              />
            ) : null}
            <span
              className={cn(
                'relative z-10 flex size-8 items-center justify-center rounded-[8px]',
                TILE[status as keyof typeof TILE] ?? TILE.idle,
              )}
            >
              <Icon className="size-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium">{agent.label}</span>
                <StatusIcon
                  className={cn(
                    'size-3.5 shrink-0',
                    status === 'running' && 'animate-spin text-accent',
                    status === 'done' && 'text-ok',
                    status === 'failed' && 'text-err',
                    status === 'waiting' && 'text-warn',
                    (status === 'idle' || status === 'skipped') && 'text-line-strong',
                  )}
                  strokeWidth={1.75}
                />
              </div>
              <p className="mt-0.5 truncate text-xs leading-[18px] text-muted">
                {state.thoughts[agentId] || agent.role}
              </p>
              {workers.length ? (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {workers.map((worker) => (
                    <span
                      key={worker.key}
                      className={cn(
                        'flex h-6 min-w-0 items-center gap-1 truncate rounded-md border border-line px-1.5 text-[11px]',
                        worker.state === 'verified' && 'border-ok/40 bg-ok-soft text-ok',
                        worker.state === 'rejected' && 'text-muted line-through opacity-60',
                        worker.state === 'failed' && 'border-err/40 text-err',
                      )}
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                      <span className="truncate">{worker.domain || worker.key}</span>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <StatusPill status={status} />
          </div>
        )
      })}
    </div>
  )
}
