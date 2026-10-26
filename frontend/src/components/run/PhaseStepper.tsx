import { CheckCircle2, Circle } from 'lucide-react'

import { cn } from '@/lib/cn'
import { PHASES, PHASE_INDEX } from '@/swarm/agents'
import type { RunState } from '@/state/runReducer'

export function PhaseStepper({ state, compact = false }: { state: RunState; compact?: boolean }) {
  const activeIndex = state.phase ? PHASE_INDEX[state.phase as keyof typeof PHASE_INDEX] : 0

  if (compact) {
    const label = state.finished
      ? 'All six phases complete'
      : `Step ${activeIndex + 1} of 6 · ${PHASES[activeIndex]?.label ?? 'Starting'}`
    const progress = state.finished ? 100 : ((activeIndex + (state.phase ? 1 : 0)) / 6) * 100
    return (
      <div className="w-full">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium">{label}</p>
          <p className="text-xs text-muted tabular-nums">{Math.round(progress)}%</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="grid w-full grid-cols-6 gap-2">
      {PHASES.map((phase, index) => {
        const done = state.finished || state.phaseDone.includes(phase.id)
        const active = !state.finished && state.phase === phase.id
        return (
          <div key={phase.id} className="min-w-0">
            <div
              className={cn(
                'h-1.5 rounded-full',
                done ? 'bg-ok' : active ? 'ss-shimmer' : 'bg-line',
              )}
            />
            <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs font-medium">
              {done ? (
                <CheckCircle2 className="size-3.5 shrink-0 text-ok" strokeWidth={1.75} />
              ) : active ? (
                <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-accent" />
              ) : (
                <Circle className="size-3.5 shrink-0 text-muted" strokeWidth={1.75} />
              )}
              <span
                className={cn(
                  'truncate',
                  done || active ? 'text-ink' : 'text-muted',
                  index === activeIndex && !done && 'font-semibold',
                )}
                title={phase.label}
              >
                {phase.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
