import { Panel } from '@/components/common/Panel'
import { StatusPill } from '@/components/common/StatusPill'
import { SwarmCanvas } from '@/swarm/SwarmCanvas'
import { MobileTimeline } from '@/swarm/MobileTimeline'
import { AGENTS } from '@/swarm/agents'
import type { RunState } from '@/state/runReducer'

export function SwarmSection({ state, isLg }: { state: RunState; isLg: boolean }) {
  const working = AGENTS.filter((agent) => state.agentStatus[agent.id] === 'running').length
  return (
    <Panel
      title="Agent swarm"
      subtitle={`${AGENTS.length} agents · ${working} working now`}
      actions={
        <div className="hidden flex-wrap items-center justify-end gap-1 sm:flex">
          <StatusPill tone="accent" label="Working" />
          <StatusPill tone="ok" label="Done" />
          <StatusPill tone="warn" label="Waiting" />
          <StatusPill tone="err" label="Failed" />
        </div>
      }
      flush
      className="overflow-hidden"
    >
      {isLg ? (
        <div className="h-[460px] p-2">
          <SwarmCanvas state={state} />
        </div>
      ) : (
        <div className="px-4 py-2">
          <MobileTimeline state={state} />
        </div>
      )}
    </Panel>
  )
}
