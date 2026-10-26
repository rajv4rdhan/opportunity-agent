import type { Node, NodeProps } from '@xyflow/react'

export interface LaneNodeData extends Record<string, unknown> {
  label: string
  width: number
}

export type LaneFlowNode = Node<LaneNodeData, 'lane'>

export function LaneLabelNode({ data }: NodeProps<LaneFlowNode>) {
  return (
    <p
      className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-muted uppercase"
      style={{ width: data.width }}
    >
      {data.label}
    </p>
  )
}
