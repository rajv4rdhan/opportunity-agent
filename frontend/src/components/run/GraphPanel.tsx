import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from 'react-force-graph-2d'

import { Panel } from '@/components/common/Panel'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'

const NODE_COLORS: Record<string, string> = {
  Student: '#4F46E5',
  Skill: '#0EA5E9',
  Project: '#8B5CF6',
  Opportunity: '#059669',
  Requirement: '#D97706',
  Organization: '#64748B',
  Country: '#A1A1AA',
}

const LEGEND = ['Student', 'Skill', 'Project', 'Opportunity', 'Requirement', 'Organization', 'Country']

interface GraphNode {
  id: string
  label?: string
  type?: string
  [key: string]: unknown
}

interface GraphLink {
  source: string
  target: string
  type?: string
  [key: string]: unknown
}

export function GraphPanel({
  data,
  loading = false,
}: {
  data: Record<string, unknown> | undefined
  loading?: boolean
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = wrapperRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const graphData = useMemo(() => {
    const nodes = Array.isArray(data?.nodes) ? (data?.nodes as GraphNode[]) : []
    const links = Array.isArray(data?.links) ? (data?.links as GraphLink[]) : []
    return { nodes: nodes.map((node) => ({ ...node })), links: links.map((link) => ({ ...link })) }
  }, [data])

  return (
    <Panel
      title="Knowledge graph"
      subtitle={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
          {LEGEND.map((type) => (
            <span key={type} className="inline-flex items-center gap-1 text-[10px] text-muted">
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: NODE_COLORS[type] }}
              />
              {type}
            </span>
          ))}
        </span>
      }
      flush
      className="overflow-hidden"
    >
      {loading && graphData.nodes.length === 0 ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-4 w-32 bg-subtle" />
          <Skeleton className="h-40 w-full bg-subtle" />
        </div>
      ) : graphData.nodes.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">
          The graph fills in once the Matcher runs.
        </p>
      ) : (
        <div ref={wrapperRef} className="h-full w-full">
          {size.width > 0 && size.height > 0 ? (
            <ForceGraph2D<GraphNode, GraphLink>
              ref={graphRef}
              graphData={graphData}
              width={size.width}
              height={size.height}
              backgroundColor="transparent"
              cooldownTicks={80}
              onEngineStop={() => graphRef.current?.zoomToFit(400, 24)}
              nodeRelSize={4}
              nodeCanvasObject={(node: NodeObject<GraphNode>, ctx, globalScale) => {
                const type = String(node.type ?? 'Opportunity')
                const color = NODE_COLORS[type] ?? NODE_COLORS.Country
                const radius = type === 'Student' ? 6 : type === 'Opportunity' ? 4.5 : 3
                ctx.beginPath()
                ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI)
                ctx.fillStyle = color
                ctx.fill()
                if (type === 'Student' || type === 'Opportunity') {
                  const label = String(node.label ?? node.id ?? '')
                  ctx.font = `${11 / globalScale}px "Inter Variable", sans-serif`
                  ctx.textAlign = 'center'
                  ctx.textBaseline = 'top'
                  ctx.fillStyle = '#71717A'
                  ctx.fillText(label.slice(0, 28), node.x ?? 0, (node.y ?? 0) + radius + 2 / globalScale)
                }
              }}
              linkColor={(link: LinkObject<GraphNode, GraphLink>) => {
                if (link.type === 'MEETS') return NODE_COLORS.Opportunity
                if (link.type === 'MISSES') return '#DC2626'
                return '#D4D4D8'
              }}
              linkWidth={1}
              linkDirectionalParticles={0}
            />
          ) : (
            <div className={cn('h-full w-full')} />
          )}
        </div>
      )}
    </Panel>
  )
}
