import { Copy, Download, Ellipsis, ExternalLink, Play, Printer } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { icsUrl, reportUrl, sopUrl } from '@/api/client'
import type { FinalReport, RunDetail } from '@/api/types'
import { StatusPill } from '@/components/common/StatusPill'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatClock, formatDuration, initials } from '@/lib/format'
import type { RunState } from '@/state/runReducer'

function etaText(elapsed: number, median: number | null | undefined, finished: boolean): string {
  if (finished || !median) return ''
  const remaining = median - elapsed
  if (remaining <= 30) return 'almost done'
  return `~${Math.max(1, Math.round(remaining / 60))} min left`
}

export function RunHeader({
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

  async function copy(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(message)
    } catch {
      toast.error('Could not copy')
    }
  }

  return (
    <div className="ss-no-print flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
          {initials(name)}
        </span>
        <h1 className="min-w-0 truncate text-xl leading-7 font-semibold">{name}</h1>
        <StatusPill status={state.status} />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => copy(runId, 'Run id copied')}
              className="inline-flex h-8 items-center gap-1 font-mono text-xs text-muted hover:text-ink"
            >
              run {runId.slice(0, 8)}
              <Copy className="size-3" strokeWidth={1.75} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Copy run id</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {state.finished ? (
          <span className="font-mono text-sm tabular-nums">
            {formatDuration(state.stats.durationSec)}
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm tabular-nums">{formatClock(elapsed)}</span>
            <span className="text-xs text-muted">{etaText(elapsed, median, false)}</span>
          </div>
        )}

        {(state.status === 'finished' || state.status === 'failed') && !isReplay ? (
          <Button
            variant="outline"
            className="h-8 gap-1.5 px-3"
            onClick={() => navigate(`/runs/${runId}?replay=1&speed=20`)}
          >
            <Play className="size-3.5" strokeWidth={1.75} />
            Replay
          </Button>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 text-muted" aria-label="Run actions">
              <Ellipsis className="size-4" strokeWidth={1.75} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onSelect={() => {
                window.location.href = reportUrl(runId)
              }}
            >
              <Download className="size-4" strokeWidth={1.75} />
              Download report (.md)
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                window.location.href = sopUrl(runId)
              }}
            >
              <Download className="size-4" strokeWidth={1.75} />
              Download SOP (.md)
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                window.location.href = icsUrl(runId)
              }}
            >
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
  )
}
