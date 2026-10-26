import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
} from '@xyflow/react'

import { AGENTS, EDGES, LANES, LAYOUT, edgeId } from '@/swarm/agents'
import { AgentNode, type AgentFlowNode } from '@/swarm/AgentNode'
import { FlowEdge } from '@/swarm/FlowEdge'
import { LaneLabelNode, type LaneFlowNode } from '@/swarm/LaneLabelNode'
import { LoopEdge } from '@/swarm/LoopEdge'
import { VerifierPoolNode, type VerifierFlowNode } from '@/swarm/VerifierPoolNode'
import type { RunState } from '@/state/runReducer'

const nodeTypes = { agent: AgentNode, verifierPool: VerifierPoolNode, lane: LaneLabelNode }
const edgeTypes = { flow: FlowEdge, loop: LoopEdge }

function CanvasInner({ state }: { state: RunState }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const { fitView } = useReactFlow()

  useEffect(() => {
    const element = wrapperRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!width) return
    const timer = setTimeout(() => {
      fitView({ padding: width >= 1200 ? 0.08 : 0.02, duration: 0 })
    }, 150)
    return () => clearTimeout(timer)
  }, [width, fitView])

  const nodes = useMemo(() => {
    const lanes: LaneFlowNode[] = LANES.map((lane) => ({
      id: lane.id,
      type: 'lane',
      position: { x: lane.x, y: lane.y },
      data: { label: lane.label, width: lane.width },
      draggable: false,
      selectable: false,
      connectable: false,
      width: lane.width,
      height: 20,
      style: { width: lane.width, height: 20 },
    }))

    const agents = AGENTS.map((agent) => {
      const layout = LAYOUT[agent.id]
      if (agent.id === 'verifier') {
        const node: VerifierFlowNode = {
          id: agent.id,
          type: 'verifierPool',
          position: { x: layout.x, y: layout.y },
          data: { workers: state.workers, tick: state.tick },
          draggable: false,
          selectable: false,
          connectable: false,
          width: layout.width,
          height: layout.height,
          style: { width: layout.width, height: layout.height },
        }
        return node
      }
      const node: AgentFlowNode = {
        id: agent.id,
        type: 'agent',
        position: { x: layout.x, y: layout.y },
        data: {
          agent,
          status: state.agentStatus[agent.id] ?? 'idle',
          thought: state.thoughts[agent.id] ?? '',
        },
        draggable: false,
        selectable: false,
        connectable: false,
        width: layout.width,
        height: layout.height,
        style: { width: layout.width, height: layout.height },
      }
      return node
    })

    return [...lanes, ...agents]
  }, [state.agentStatus, state.thoughts, state.workers, state.tick])

  const edges = useMemo(() => {
    const active = new Set(state.activeEdges)
    const traversed = new Set(state.traversedEdges)
    const visibleHandoffs = state.handoffs
      .slice(-6)
      .filter((handoff) => active.has(edgeId(handoff.src, handoff.dst)))
      .slice(-2)
    const labelledEdges = new Set(visibleHandoffs.map((handoff) => edgeId(handoff.src, handoff.dst)))

    return EDGES.map((spec) => {
      const id = edgeId(spec.source, spec.target)
      const isActive = active.has(id)
      const handoff = [...visibleHandoffs]
        .reverse()
        .find((item) => item.src === spec.source && item.dst === spec.target)
      const label =
        isActive && labelledEdges.has(id)
          ? handoff?.label || spec.label
          : isActive
            ? undefined
            : undefined
      const edge: Edge = {
        id,
        source: spec.source,
        target: spec.target,
        sourceHandle: spec.sourceHandle,
        targetHandle: spec.targetHandle,
        type: spec.type,
        data: {
          active: isActive,
          traversed: traversed.has(id),
          label,
        },
      }
      return edge
    })
  }, [state.activeEdges, state.traversedEdges, state.handoffs])

  return (
    <div ref={wrapperRef} className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: width >= 1200 ? 0.08 : 0.02 }}
        minZoom={0.4}
        maxZoom={1.2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll={false}
        zoomOnPinch
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
        className="rounded-[var(--radius-card)]"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={0} color="transparent" />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  )
}

export function SwarmCanvas({ state }: { state: RunState }) {
  return (
    <ReactFlowProvider>
      <CanvasInner state={state} />
    </ReactFlowProvider>
  )
}
