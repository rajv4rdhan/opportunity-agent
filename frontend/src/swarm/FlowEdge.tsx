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
  const stroke = active || traversed ? 'var(--color-accent)' : 'var(--color-line-strong)'

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
          opacity: traversed && !active ? 0.45 : 1,
        }}
      />
      {active ? (
        <>
          <circle className="ss-particle" r="3.5" fill="var(--color-accent)">
            <animateMotion dur="1.3s" repeatCount="indefinite" path={path} />
          </circle>
          <circle className="ss-particle" r="2.5" fill="var(--color-accent)" opacity="0.5">
            <animateMotion dur="1.3s" begin="0.65s" repeatCount="indefinite" path={path} />
          </circle>
        </>
      ) : null}
      {active && data?.label ? (
        <EdgeLabelRenderer>
          <div
            className={cn(
              'pointer-events-none absolute rounded-[6px] bg-accent px-2 py-0.5 font-mono text-[11px] font-medium text-on-accent shadow-card',
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
