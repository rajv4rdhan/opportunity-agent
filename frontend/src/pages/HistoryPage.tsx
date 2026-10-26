import { useNavigate } from 'react-router'
import { Play } from 'lucide-react'

import { useRuns } from '@/api/queries'
import type { RunSummary } from '@/api/types'
import { EmptyState } from '@/components/common/EmptyState'
import { Panel } from '@/components/common/Panel'
import { StatusPill } from '@/components/common/StatusPill'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Container } from '@/components/layout/Container'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatDate, formatDuration, formatRelative, initials } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

function Avatar({ name }: { name: string | null | undefined }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
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
        subtitle="Every search you ran, with a replay."
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
        <>
          <div className="flex flex-col gap-3 sm:hidden">
            {runs.data.map((run) => (
              <article
                key={run.id}
                data-testid="history-card"
                onClick={() => navigate(`/runs/${run.id}`)}
                className="cursor-pointer rounded-[var(--radius-card)] border border-line bg-surface p-4 text-left shadow-card"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar name={run.student_name} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{run.student_name || '—'}</p>
                      <p className="font-mono text-[11px] text-muted">{run.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <StatusPill status={run.status} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                  <span>{formatRelative(run.created_at)}</span>
                  <span className="font-mono tabular-nums">{formatDuration(run.duration_sec)}</span>
                  <span>{run.verified_count ?? 0} verified</span>
                  {canReplay(run) ? (
                    <Button
                      variant="ghost"
                      className="ml-auto h-8 gap-1 px-2 text-xs text-accent"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(`/runs/${run.id}?replay=1&speed=20`)
                      }}
                    >
                      <Play className="size-3" strokeWidth={1.75} />
                      Replay
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <Panel flush className="hidden overflow-hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.data.map((run) => (
                  <TableRow
                    key={run.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/runs/${run.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar name={run.student_name} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{run.student_name || '—'}</p>
                          <p className="font-mono text-[11px] text-muted">{run.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Started value={run.created_at} />
                    </TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">
                      {formatDuration(run.duration_sec)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">{run.verified_count ?? 0}</TableCell>
                    <TableCell>
                      <StatusPill status={run.status} />
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex justify-end gap-1"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          className="h-8 px-2 text-xs"
                          onClick={() => navigate(`/runs/${run.id}`)}
                        >
                          Open
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-8 gap-1 px-2 text-xs"
                          disabled={!canReplay(run)}
                          onClick={() => navigate(`/runs/${run.id}?replay=1&speed=20`)}
                        >
                          <Play className="size-3" strokeWidth={1.75} />
                          Replay
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </>
      )}
    </Container>
  )
}
