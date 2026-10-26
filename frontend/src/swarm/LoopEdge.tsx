import { BaseEdge, EdgeLabelRenderer, type Edge, type EdgeProps } from '@xyflow/react'

export interface LoopEdgeData extends Record<string, unknown> {
  active: boolean
  traversed: boolean
  label?: string
  waypoints?: Array<{ x: number; y: number }>
}

export type LoopEdgeType = Edge<LoopEdgeData, 'loop'>

function roundedPath(points: Array<{ x: number; y: number }>, radius = 8): string {
  if (points.length < 2) return ''
  let path = `M ${points[0].x} ${points[0].y}`
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const next = points[index + 1]
    const incoming = Math.hypot(current.x - previous.x, current.y - previous.y)
    const outgoing = Math.hypot(next.x - current.x, next.y - current.y)
    if (incoming < 0.01 || outgoing < 0.01) {
      path += ` L ${current.x} ${current.y}`
      continue
    }
    const size = Math.min(radius, incoming / 2, outgoing / 2)
    const before = {
      x: current.x - ((current.x - previous.x) / incoming) * size,
      y: current.y - ((current.y - previous.y) / incoming) * size,
    }
    const after = {
      x: current.x + ((next.x - current.x) / outgoing) * size,
      y: current.y + ((next.y - current.y) / outgoing) * size,
    }
    path += ` L ${before.x} ${before.y} Q ${current.x} ${current.y} ${after.x} ${after.y}`
  }
  const last = points[points.length - 1]
  path += ` L ${last.x} ${last.y}`
  return path
}

function waypointsFor(
  source: string,
  target: string,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  provided?: Array<{ x: number; y: number }>,
): Array<{ x: number; y: number }> {
  if (provided?.length) {
    return [{ x: sourceX, y: sourceY }, ...provided, { x: targetX, y: targetY }]
  }
  if (source === 'profile_analyst' && target === 'github_enricher') {
    const bulge = -24
    return [
      { x: sourceX, y: sourceY },
      { x: bulge, y: sourceY },
      { x: bulge, y: targetY },
      { x: targetX, y: targetY },
    ]
  }
  if (source === 'critic' && target === 'sop_writer') {
    const bulge = sourceX + 24
    return [
      { x: sourceX, y: sourceY },
      { x: bulge, y: sourceY },
      { x: bulge, y: targetY },
      { x: targetX, y: targetY },
    ]
  }
  if (source === 'supervisor' && target === 'planner') {
    return [
      { x: sourceX, y: sourceY },
      { x: 750, y: sourceY },
      { x: 750, y: 330 },
      { x: 480, y: 330 },
      { x: 480, y: targetY },
      { x: targetX, y: targetY },
    ]
  }
  return [
    { x: sourceX, y: sourceY },
    { x: sourceX - 24, y: sourceY },
    { x: sourceX - 24, y: targetY },
    { x: targetX, y: targetY },
  ]
}

export function LoopEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps<LoopEdgeType>) {
  const points = waypointsFor(source, target, sourceX, sourceY, targetX, targetY, data?.waypoints)
  const path = roundedPath(points)
  const active = Boolean(data?.active)
  const traversed = Boolean(data?.traversed)
  const stroke = active || traversed ? 'var(--color-accent)' : 'var(--color-line-strong)'
  const labelPoint = points[Math.floor(points.length / 2)] ?? { x: sourceX, y: sourceY }

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke,
          strokeWidth: active ? 2 : 1.5,
          strokeDasharray: active ? '6 4' : '4 4',
          animation: active ? 'ss-dash .6s linear infinite' : undefined,
          opacity: traversed && !active ? 0.6 : 1,
        }}
      />
      {data?.label ? (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute rounded-[6px] border border-line bg-surface px-2 py-0.5 font-mono text-[10px] tracking-[0.08em] text-muted uppercase data-[active=true]:border-accent data-[active=true]:bg-accent data-[active=true]:text-on-accent"
            data-active={active}
            style={{
              transform: `translate(-50%, -50%) translate(${labelPoint.x}px, ${labelPoint.y}px)`,
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}
