import { Check, Copy, Download, Ellipsis, ExternalLink, Play, Printer } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { icsUrl, reportUrl, sopUrl } from '@/api/client'
import type { FinalReport, RunDetail } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'
import { formatClock, formatDuration, initials } from '@/lib/format'
import { PHASES, PHASE_INDEX } from '@/swarm/agents'
import type { RunState } from '@/state/runReducer'

const STATUS_LABEL: Record<string, string> = {
  queued: 'Queued',
  running: 'Running',
  waiting_input: 'Needs your input',
  finished: 'Finished',
  failed: 'Stopped',
}

function etaText(elapsed: number, median: number | null | undefined): string {
  if (!median) return ''
  const remaining = median - elapsed
  if (remaining <= 30) return 'almost done'
  return `~${Math.max(1, Math.round(remaining / 60))} min left`
}

/**
 * The mission band: one solid blue slab that carries who, status, time and the
 * six-phase track. Replaces a separate header row + stepper.
 */
export function RunBand({
  state,
  run,
  report,
  median,
  isReplay = false,
}: {
  state: RunState
  run: RunDetail | undefined
  report: FinalReport | null
  median: number | null | undefined
  isReplay?: boolean
}) {
  const navigate = useNavigate()
  const name = report?.profile?.name || state.studentName || run?.student_name || 'Student'
  const lastEvent = state.events[state.events.length - 1]
  const elapsed = state.finished
    ? state.stats.durationSec
    : state.startedAt
      ? isReplay && lastEvent
        ? Math.max(0, (Date.parse(lastEvent.ts) - Date.parse(state.startedAt)) / 1000)
        : Math.max(0, (Date.now() - Date.parse(state.startedAt)) / 1000)
      : 0
  const runId = state.runId
  const activeIndex = state.phase ? PHASE_INDEX[state.phase as keyof typeof PHASE_INDEX] : -1
  const doneCount = state.finished ? PHASES.length : state.phaseDone.length
  const live = !state.finished && state.status !== 'failed'

  async function copy(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(message)
    } catch {
      toast.error('Could not copy')
    }
  }

  return (
    <section
      data-testid="run-band"
      className="ss-no-print overflow-hidden rounded-[18px] bg-accent-deep text-white dark:bg-accent-soft"
    >
      <div className="flex flex-col gap-5 px-5 pt-5 pb-4 sm:px-7 sm:pt-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-white text-base font-semibold text-accent-deep dark:text-accent">
            {initials(name)}
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-[0.14em] text-white/65 uppercase">
              Funding dossier · {STATUS_LABEL[state.status] ?? state.status}
            </p>
            <h1 className="truncate text-[28px] leading-9 font-semibold tracking-[-0.02em]" title={name}>
              {name}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="mr-1 text-right">
            <p className="font-mono text-[26px] leading-8 tabular-nums">
              {state.finished ? formatDuration(state.stats.durationSec) : formatClock(elapsed)}
            </p>
            <p className="text-xs text-white/65">
              {state.finished ? 'total time' : live ? etaText(elapsed, median) || 'elapsed' : 'elapsed'}
            </p>
          </div>

          {(state.status === 'finished' || state.status === 'failed') && !isReplay ? (
            <Button
              variant="secondary"
              className="h-9 gap-1.5 bg-white px-3 text-accent-deep hover:bg-white/90 dark:text-accent"
              onClick={() => navigate(`/runs/${runId}?replay=1&speed=20`)}
            >
              <Play className="size-3.5" strokeWidth={2} />
              Replay
            </Button>
          ) : null}

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => copy(runId, 'Run id copied')}
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-white/25 px-2.5 font-mono text-xs text-white/80 hover:bg-white/10"
              >
                {runId.slice(0, 8)}
                <Copy className="size-3" strokeWidth={1.75} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Copy run id</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-white hover:bg-white/10 hover:text-white"
                aria-label="Run actions"
              >
                <Ellipsis className="size-4" strokeWidth={1.75} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onSelect={() => (window.location.href = reportUrl(runId))}>
                <Download className="size-4" strokeWidth={1.75} />
                Download report (.md)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => (window.location.href = sopUrl(runId))}>
                <Download className="size-4" strokeWidth={1.75} />
                Download SOP (.md)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => (window.location.href = icsUrl(runId))}>
                <Download className="size-4" strokeWidth={1.75} />
                Add deadlines (.ics)
              </DropdownMenuItem>
              {state.status === 'finished' ? (
                <DropdownMenuItem onSelect={() => window.print()}>
                  <Printer className="size-4" strokeWidth={1.75} />
                  Print results
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => copy(`${window.location.origin}/runs/${runId}`, 'Run link copied')}
              >
                <ExternalLink className="size-4" strokeWidth={1.75} />
                Copy run link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Six-phase track: equal segments; done = white, live = striped. */}
      <div className="border-t border-white/15 px-5 pt-3 pb-4 sm:px-7">
        <div className="mb-2 flex items-center justify-between text-xs text-white/70 sm:hidden">
          <span>
            {state.finished
              ? 'All six phases complete'
              : `Step ${Math.max(1, activeIndex + 1)} of 6 · ${PHASES[Math.max(0, activeIndex)]?.label ?? 'Starting'}`}
          </span>
          <span className="font-mono tabular-nums">{Math.round((doneCount / 6) * 100)}%</span>
        </div>
        <ol className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {PHASES.map((phase, index) => {
            const done = state.finished || state.phaseDone.includes(phase.id)
            const active = !state.finished && state.phase === phase.id
            return (
              <li key={phase.id} className="min-w-0">
                <div className="relative h-1.5 overflow-hidden rounded-full bg-white/20">
                  <div
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out',
                      done ? 'w-full bg-white' : active ? 'ss-stripes-light w-full' : 'w-0',
                    )}
                  />
                </div>
                <p
                  className={cn(
                    'mt-2 hidden min-w-0 items-center gap-1.5 text-xs sm:flex',
                    done || active ? 'text-white' : 'text-white/55',
                  )}
                >
                  <span className="font-mono text-[10px] text-white/60">{String(index + 1).padStart(2, '0')}</span>
                  <span className={cn('truncate', active && 'font-semibold')} title={phase.label}>
                    {phase.label}
                  </span>
                  {done ? <Check className="size-3 shrink-0" strokeWidth={2.5} /> : null}
                  {active ? <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-white" /> : null}
                </p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
