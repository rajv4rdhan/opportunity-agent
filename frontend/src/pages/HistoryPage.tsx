import { useNavigate } from 'react-router'
import { Play, Plus } from 'lucide-react'

import { useRuns } from '@/api/queries'
import type { RunSummary } from '@/api/types'
import { EmptyState } from '@/components/common/EmptyState'
import { Panel } from '@/components/common/Panel'
import { StatusPill } from '@/components/common/StatusPill'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Container } from '@/components/layout/Container'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatDate, formatDuration, formatRelative, initials } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

function Avatar({ name }: { name: string | null | undefined }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-accent text-sm font-semibold text-on-accent">
      {initials(name)}
    </span>
  )
}

function Started({ value }: { value: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-xs text-muted">{formatRelative(value)}</span>
      </TooltipTrigger>
      <TooltipContent>{formatDate(value, 'd MMM yyyy, HH:mm')}</TooltipContent>
    </Tooltip>
  )
}

function canReplay(run: RunSummary): boolean {
  return run.status === 'finished' || run.status === 'failed'
}

export function HistoryPage() {
  useDocumentTitle('History · ScholarSwarm')
  const navigate = useNavigate()
  const runs = useRuns()

  return (
    <Container>
      <PageHeader
        title="History"
        subtitle="Every dossier you've built. Open one, or replay how the swarm made it."
        actions={
          <Button className="h-9" onClick={() => navigate('/')}>
            New search
          </Button>
        }
      />

      {runs.isError ? (
        <Panel>
          <EmptyState
            title="Could not load history"
            description={runs.error instanceof Error ? runs.error.message : 'Try again in a moment.'}
            action={
              <Button className="h-9" onClick={() => void runs.refetch()}>
                Retry
              </Button>
            }
          />
        </Panel>
      ) : runs.isLoading ? (
        <Panel className="p-5">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full bg-subtle" />
            ))}
          </div>
        </Panel>
      ) : !runs.data?.length ? (
        <Panel>
          <EmptyState
            title="No searches yet"
            description="Start with a resume or a few sentences about yourself."
            action={
              <Button className="h-9" onClick={() => navigate('/')}>
                Start a search
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="group flex min-h-[208px] flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-accent/35 text-accent transition-colors hover:border-accent hover:bg-accent-soft"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-accent text-on-accent transition-transform duration-300 group-hover:rotate-90">
              <Plus className="size-5" strokeWidth={2} />
            </span>
            <span className="text-sm font-semibold">Start a new search</span>
          </button>
          {runs.data.map((run, index) => (
            <article
              key={run.id}
              data-testid="history-card"
              onClick={() => navigate(`/runs/${run.id}`)}
              className="ss-rise group flex min-h-[208px] cursor-pointer flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-card transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[var(--shadow-lift)]"
              style={{ ['--i' as string]: index + 1 }}
            >
              <div className="flex items-start justify-between gap-3 p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={run.student_name} />
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold" title={run.student_name || ''}>
                      {run.student_name || 'Unnamed student'}
                    </p>
                    <p className="font-mono text-[11px] text-muted">{run.id.slice(0, 8)}</p>
                  </div>
                </div>
                <StatusPill status={run.status} />
              </div>
              <dl className="mt-auto grid grid-cols-3 border-t border-line">
                <div className="px-5 py-3">
                  <dt className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">Verified</dt>
                  <dd className="text-[22px] leading-7 font-semibold text-accent tabular-nums">{run.verified_count ?? 0}</dd>
                </div>
                <div className="border-l border-line px-5 py-3">
                  <dt className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">Time</dt>
                  <dd className="font-mono text-sm leading-7 tabular-nums">{formatDuration(run.duration_sec)}</dd>
                </div>
                <div className="border-l border-line px-5 py-3">
                  <dt className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">Started</dt>
                  <dd className="leading-7">
                    <Started value={run.created_at} />
                  </dd>
                </div>
              </dl>
              <div className="flex items-center justify-between border-t border-line bg-canvas/60 px-5 py-2">
                <span className="text-xs font-medium text-accent group-hover:underline">Open dossier →</span>
                {canReplay(run) ? (
                  <Button
                    variant="ghost"
                    className="h-8 gap-1 px-2 text-xs text-accent hover:bg-accent-soft hover:text-accent"
                    onClick={(event) => {
                      event.stopPropagation()
                      navigate(`/runs/${run.id}?replay=1&speed=20`)
                    }}
                  >
                    <Play className="size-3" strokeWidth={2} />
                    Replay
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </Container>
  )
}
