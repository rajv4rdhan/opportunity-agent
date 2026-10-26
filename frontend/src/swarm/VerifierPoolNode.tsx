import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Check, Loader2, ShieldCheck, X } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'
import type { Worker } from '@/state/runReducer'

export interface VerifierNodeData extends Record<string, unknown> {
  workers: Record<string, Worker>
  tick: number
}

export type VerifierFlowNode = Node<VerifierNodeData, 'verifierPool'>

const ORDER: Record<string, number> = {
  fetching: 0,
  reading: 0,
  verified: 1,
  queued: 2,
  failed: 3,
  rejected: 4,
}

function chipClass(worker: Worker, tick: number): string {
  if (worker.flashUntil >= tick) {
    return 'border-warn/40 text-ink ring-2 ring-warn/40'
  }
  switch (worker.state) {
    case 'fetching':
      return 'border-accent/30 text-ink'
    case 'reading':
      return 'border-accent text-ink'
    case 'verified':
      return 'border-ok/40 bg-ok-soft text-ok'
    case 'rejected':
      return 'border-line text-muted line-through opacity-60'
    case 'failed':
      return 'border-err/40 text-err'
    default:
      return 'border-line text-muted'
  }
}

function ChipIcon({ state }: { state: string }) {
  if (state === 'verified') return <Check className="size-3" strokeWidth={2} />
  if (state === 'failed') return <X className="size-3" strokeWidth={2} />
  if (state === 'fetching') {
    return <span className="size-1.5 animate-pulse rounded-full bg-accent" />
  }
  if (state === 'reading') return <span className="size-1.5 rounded-full bg-accent" />
  return <span className="size-1.5 rounded-full bg-line-strong" />
}

export function VerifierPoolNode({ data }: NodeProps<VerifierFlowNode>) {
  const workers = Object.values(data.workers).sort(
    (first, second) => (ORDER[first.state] ?? 5) - (ORDER[second.state] ?? 5),
  )
  const running = workers.filter(
    (worker) => worker.state === 'fetching' || worker.state === 'reading',
  ).length
  const verified = workers.filter((worker) => worker.state === 'verified').length
  const rejected = workers.filter((worker) => worker.state === 'rejected').length
  const visible = workers.slice(0, 10)

  return (
    <div
      data-testid="verifier-pool"
      className="flex h-[300px] w-[230px] flex-col rounded-[10px] border border-line bg-surface px-3 py-2.5"
    >
      <Handle id="l-t" type="target" position={Position.Left} style={{ top: 38 }} isConnectable={false} />
      <Handle id="r-s" type="source" position={Position.Right} style={{ top: 38 }} isConnectable={false} />

      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-[8px] bg-subtle text-muted">
          <ShieldCheck className="size-4" strokeWidth={1.75} />
        </span>
        <span
          data-testid="node-name"
          className="min-w-0 flex-1 truncate text-[13px] leading-[18px] font-semibold"
        >
          Verifiers
        </span>
        {running > 0 ? (
          <Loader2 className="size-3.5 animate-spin text-accent" strokeWidth={1.75} />
        ) : (
          <Check className="size-3.5 text-ok" strokeWidth={1.75} />
        )}
      </div>
      <p className="mt-1 pl-10 text-xs leading-[16px] text-muted">
        Reads official pages in parallel
      </p>

      <div className="mt-3 grid grid-cols-3 divide-x divide-line rounded-[8px] border border-line">
        {[
          { label: 'Running', value: running },
          { label: 'Verified', value: verified },
          { label: 'Rejected', value: rejected },
        ].map((item) => (
          <div key={item.label} className="px-1 py-1.5 text-center">
            <p className="text-[15px] leading-5 font-semibold tabular-nums">{item.value}</p>
            <p className="text-[10px] leading-3 tracking-[0.04em] text-muted uppercase">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 overflow-hidden">
        {visible.map((worker) => (
          <Tooltip key={worker.key}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'flex h-6 min-w-0 items-center gap-1 truncate rounded-md border px-1.5 text-[11px]',
                  chipClass(worker, data.tick),
                )}
              >
                <ChipIcon state={worker.state} />
                <span className="truncate">{worker.domain || worker.key}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px]">
              <p className="font-medium">{worker.title || worker.domain}</p>
              <p className="capitalize">{worker.state}</p>
              {worker.message ? <p className="text-muted">{worker.message}</p> : null}
              <p className="mt-1 truncate text-muted">{worker.url}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      {workers.length > visible.length ? (
        <p className="mt-1 text-xs leading-[18px] text-muted">
          +{workers.length - visible.length} more
        </p>
      ) : null}
    </div>
  )
}
