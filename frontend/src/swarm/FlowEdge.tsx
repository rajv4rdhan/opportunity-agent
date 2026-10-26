import { BaseEdge, EdgeLabelRenderer, getBezierPath, getStraightPath, type Edge, type EdgeProps } from '@xyflow/react'

import { cn } from '@/lib/cn'

export interface FlowEdgeData extends Record<string, unknown> {
  active: boolean
  traversed: boolean
  label?: string
}

export type FlowEdgeType = Edge<FlowEdgeData, 'flow'>

export function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<FlowEdgeType>) {
  const straight = Math.abs(sourceX - targetX) < 1 || Math.abs(sourceY - targetY) < 1
  const [path, labelX, labelY] = straight
    ? getStraightPath({ sourceX, sourceY, targetX, targetY })
    : getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      })

  const active = Boolean(data?.active)
  const traversed = Boolean(data?.traversed)
  const stroke = active
    ? 'var(--color-accent)'
    : traversed
      ? 'var(--color-muted)'
      : 'var(--color-line-strong)'

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke,
          strokeWidth: active ? 2 : 1.5,
          strokeDasharray: active ? '6 4' : undefined,
          animation: active ? 'ss-dash .6s linear infinite' : undefined,
          opacity: traversed && !active ? 0.6 : 1,
        }}
      />
      {active ? (
        <circle className="ss-particle" r="3" fill="var(--color-accent)">
          <animateMotion dur="1.2s" repeatCount="indefinite" path={path} />
        </circle>
      ) : null}
      {active && data?.label ? (
        <EdgeLabelRenderer>
          <div
            className={cn(
              'pointer-events-none absolute rounded-full border border-accent/30 bg-surface px-2 py-0.5 text-[11px] font-medium text-accent shadow-card',
              'animate-in fade-in-0 duration-200',
            )}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}
