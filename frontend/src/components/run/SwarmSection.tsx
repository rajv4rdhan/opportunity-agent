import { SwarmCanvas } from '@/swarm/SwarmCanvas'
import { MobileTimeline } from '@/swarm/MobileTimeline'
import { AGENTS } from '@/swarm/agents'
import type { RunState } from '@/state/runReducer'

const LEGEND = [
  { label: 'Working', swatch: 'bg-accent' },
  { label: 'Done', swatch: 'border-2 border-accent bg-surface' },
  { label: 'Waiting', swatch: 'border-2 border-warn bg-surface' },
  { label: 'Idle', swatch: 'border border-line-strong bg-surface' },
]

/** The swarm map, drawn on a drafting sheet. */
export function SwarmSection({ state, isLg }: { state: RunState; isLg: boolean }) {
  const working = AGENTS.filter((agent) => state.agentStatus[agent.id] === 'running').length
  const done = AGENTS.filter((agent) => state.agentStatus[agent.id] === 'done').length

  return (
    <section
      data-testid="panel"
      className="flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-card"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="text-base leading-6 font-semibold">Agent swarm</h2>
          <span className="font-mono text-xs text-muted tabular-nums">
            {working} working · {done}/{AGENTS.length} done
          </span>
        </div>
        <ul className="hidden items-center gap-4 sm:flex">
          {LEGEND.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5 text-xs text-muted">
              <span className={`size-3 rounded-[3px] ${item.swatch}`} aria-hidden="true" />
              {item.label}
            </li>
          ))}
        </ul>
      </header>
      {isLg ? (
        <div className="ss-drafting h-[480px] p-2">
          <SwarmCanvas state={state} />
        </div>
      ) : (
        <div className="px-4 py-2">
          <MobileTimeline state={state} />
        </div>
      )}
    </section>
  )
}
