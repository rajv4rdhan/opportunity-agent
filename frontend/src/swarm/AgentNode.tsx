import type { ComponentType } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { CheckCircle2, Circle, Hand, Loader2, MinusCircle, XCircle } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'
import type { AgentMeta } from '@/swarm/agents'

export interface AgentNodeData extends Record<string, unknown> {
  agent: AgentMeta
  status: string
  thought: string
}

export type AgentFlowNode = Node<AgentNodeData, 'agent'>

const STATUS_ICON: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  running: Loader2,
  done: CheckCircle2,
  failed: XCircle,
  waiting: Hand,
  skipped: MinusCircle,
  idle: Circle,
}

// Blue/white states: running fills solid blue; done keeps a blue bar and check.
const NODE_STATE: Record<string, string> = {
  idle: 'border-line bg-surface text-ink',
  running: 'border-accent bg-accent text-on-accent shadow-[0_10px_24px_-10px_var(--color-accent)] animate-[ss-pulse_1.6s_ease-in-out_infinite]',
  done: 'border-accent/45 bg-surface text-ink shadow-[inset_3px_0_0_var(--color-accent)]',
  failed: 'border-err bg-err-soft text-ink',
  waiting: 'border-warn bg-warn-soft text-ink ring-4 ring-warn/15',
  skipped: 'border-dashed border-line-strong bg-surface text-ink opacity-55',
}

const TILE_STATE: Record<string, string> = {
  idle: 'bg-subtle text-muted',
  running: 'bg-white/15 text-on-accent',
  done: 'bg-accent-soft text-accent',
  failed: 'bg-surface text-err',
  waiting: 'bg-surface text-warn',
  skipped: 'bg-subtle text-muted',
}

const STATUS_COLOR: Record<string, string> = {
  running: 'text-on-accent',
  done: 'text-accent',
  failed: 'text-err',
  waiting: 'text-warn',
  skipped: 'text-muted',
  idle: 'text-line-strong',
}

const HANDLES: Array<{ id: string; type: 'source' | 'target'; position: Position }> = [
  { id: 't-s', type: 'source', position: Position.Top },
  { id: 'b-s', type: 'source', position: Position.Bottom },
  { id: 'l-s', type: 'source', position: Position.Left },
  { id: 'r-s', type: 'source', position: Position.Right },
  { id: 't-t', type: 'target', position: Position.Top },
  { id: 'b-t', type: 'target', position: Position.Bottom },
  { id: 'l-t', type: 'target', position: Position.Left },
  { id: 'r-t', type: 'target', position: Position.Right },
]

export function AgentNode({ data }: NodeProps<AgentFlowNode>) {
  const { agent, status, thought } = data
  const Icon = agent.icon
  const StatusIcon = STATUS_ICON[status] ?? Circle

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          data-testid="agent-node"
          data-status={status}
          className={cn(
            'flex h-[76px] w-[210px] flex-col justify-center gap-1 rounded-[10px] border px-3 py-2.5 transition-[background-color,border-color,box-shadow,color] duration-500',
            NODE_STATE[status] ?? NODE_STATE.idle,
          )}
        >
          {HANDLES.map((handle) => (
            <Handle
              key={handle.id}
              id={handle.id}
              type={handle.type}
              position={handle.position}
              isConnectable={false}
            />
          ))}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-[8px]',
                TILE_STATE[status] ?? TILE_STATE.idle,
              )}
            >
              <Icon className="size-4" strokeWidth={1.75} />
            </span>
            <span
              data-testid="node-name"
              className="min-w-0 flex-1 truncate text-[13px] leading-[18px] font-semibold"
              title={agent.label}
            >
              {agent.label}
            </span>
            <StatusIcon
              className={cn(
                'size-3.5 shrink-0',
                STATUS_COLOR[status] ?? STATUS_COLOR.idle,
                status === 'running' && 'animate-spin',
              )}
              strokeWidth={1.75}
            />
          </div>
          <p
            className={cn(
              'truncate pl-10 text-xs leading-[16px]',
              status === 'running' ? 'text-on-accent/80' : 'text-muted',
            )}
            title={thought || agent.role}
          >
            {thought || agent.role}
          </p>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px]">
        <p className="font-medium">{agent.label}</p>
        <p className="text-muted">{agent.role}</p>
        {thought ? <p className="mt-1">{thought}</p> : null}
      </TooltipContent>
    </Tooltip>
  )
}
