import type { Node, NodeProps } from '@xyflow/react'

import { LANES } from '@/swarm/agents'

export interface LaneNodeData extends Record<string, unknown> {
  label: string
  width: number
}

export type LaneFlowNode = Node<LaneNodeData, 'lane'>

export function LaneLabelNode({ id, data }: NodeProps<LaneFlowNode>) {
  const index = LANES.findIndex((lane) => lane.id === id) + 1
  return (
    <p
      className="flex items-center gap-2 font-mono text-[11px] leading-4 tracking-[0.1em] text-accent uppercase"
      style={{ width: data.width }}
    >
      <span className="rounded-[4px] bg-accent px-1 text-on-accent">{String(index).padStart(2, '0')}</span>
      <span className="truncate">{data.label}</span>
      <span aria-hidden="true" className="h-px min-w-3 flex-1 bg-accent/30" />
    </p>
  )
}
