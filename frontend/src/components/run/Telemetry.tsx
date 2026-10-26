import { useCountUp } from '@/lib/useCountUp'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import type { RunState } from '@/state/runReducer'

function Value({ value }: { value: number }) {
  const shown = useCountUp(value, 700)
  return <>{Math.round(shown)}</>
}

/** Six live counters in one ruled 3×2 grid (no separate cards). */
export function Telemetry({ state }: { state: RunState }) {
  const verified = Object.values(state.workers).filter((worker) => worker.state === 'verified').length
  const recoveries = state.stats.retries + state.stats.fallbacks
  const tints = ['var(--ss-pink)', 'var(--ss-sky)', 'var(--ss-lilac)', 'var(--ss-mint)', 'var(--ss-peach)', 'var(--ss-sky)']
  const items: Array<{ label: string; value: number | string; tone?: 'warn' | 'accent' }> = [
    { label: 'LLM calls', value: state.stats.llmCalls },
    { label: 'Pages read', value: state.stats.pagesRead },
    { label: 'Candidates', value: state.candidates.length },
    { label: 'Verified', value: verified, tone: verified > 0 ? 'accent' : undefined },
    { label: 'Recoveries', value: recoveries, tone: recoveries > 0 ? 'warn' : undefined },
    { label: 'Cost', value: formatMoney(state.stats.estCostUsd) },
  ]

  return (
    <section
      data-testid="panel"
      aria-label="Live counters"
      className="grid grid-cols-3 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-card"
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          data-testid="kpi"
          style={{ ['--tint' as string]: tints[index] }}
          className={cn(
            'ss-tint min-w-0 px-4 py-3',
            index % 3 !== 0 && 'border-l border-line',
            index >= 3 && 'border-t border-line',
          )}
        >
          <p className="truncate font-mono text-[10px] tracking-[0.12em] text-muted uppercase" title={item.label}>
            {item.label}
          </p>
          <p
            data-testid="kpi-value"
            className={cn(
              'mt-0.5 font-display text-[24px] leading-7 font-semibold tracking-[-0.02em] tabular-nums',
              item.tone === 'warn' ? 'text-warn' : item.tone === 'accent' ? 'text-accent' : 'text-ink',
            )}
          >
            {typeof item.value === 'number' ? <Value value={item.value} /> : item.value}
          </p>
        </div>
      ))}
    </section>
  )
}
