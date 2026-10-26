import { KpiTile } from '@/components/common/KpiTile'
import { formatMoney } from '@/lib/format'
import type { RunState } from '@/state/runReducer'

export function KpiStrip({ state }: { state: RunState }) {
  const verified = Object.values(state.workers).filter(
    (worker) => worker.state === 'verified',
  ).length
  const recoveries = state.stats.retries + state.stats.fallbacks
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <KpiTile label="LLM calls" value={state.stats.llmCalls} />
      <KpiTile label="Pages read" value={state.stats.pagesRead} />
      <KpiTile label="Candidates" value={state.candidates.length} />
      <KpiTile label="Verified" value={verified} />
      <KpiTile label="Recoveries" value={recoveries} tone={recoveries > 0 ? 'warn' : undefined} />
      <KpiTile label="Cost" value={formatMoney(state.stats.estCostUsd)} />
    </div>
  )
}
