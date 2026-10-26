import { CalendarClock } from 'lucide-react'

import { useCountUp } from '@/lib/useCountUp'
import { formatDate } from '@/lib/format'
import type { FinalReport } from '@/api/types'

function Figure({ value }: { value: number }) {
  const shown = useCountUp(value, 900, true)
  return <>{Math.round(shown)}</>
}

/** Opening page of the dossier: one sentence and three ruled figures. */
export function ResultSummary({ report }: { report: FinalReport }) {
  const opportunities = report.all_opportunities ?? []
  const verified = opportunities.filter((item) => item.verification !== 'unverified').length
  const eligible = opportunities.filter((item) => item.eligibility === 'eligible').length
  const strong = report.top5?.length ?? 0
  const nearest = opportunities
    .filter((item) => item.deadline && !item.is_expired)
    .sort((a, b) => Date.parse(a.deadline as string) - Date.parse(b.deadline as string))[0]
  const unlockable = report.gaps?.[0]?.unlocks?.length ?? 0

  const figures = [
    { label: 'Verified from official pages', value: verified },
    { label: 'Eligible for you today', value: eligible },
    { label: 'Unlockable with one step', value: unlockable },
  ]

  return (
    <article
      data-testid="result-summary"
      className="rounded-[24px] border border-line bg-surface p-6 shadow-card sm:p-8"
    >
      <p className="font-mono text-[11px] tracking-[0.14em] text-accent uppercase">01 / 07 · Summary</p>
      <p className="mt-3 max-w-[820px] font-display text-[32px] leading-[40px] font-semibold tracking-[-0.025em] text-ink max-sm:text-[24px] max-sm:leading-8">
        We verified <span className="text-accent">{verified} opportunities</span> from official sources —{' '}
        {strong} are strong matches for you.
      </p>
      <p className="mt-3 flex items-center gap-2 text-sm text-muted">
        <CalendarClock className="size-4 shrink-0 text-accent" strokeWidth={1.75} />
        {nearest?.deadline
          ? `Nearest deadline: ${formatDate(nearest.deadline, 'd MMM yyyy')} (${nearest.name})`
          : 'Most deadlines are rolling — check each official page.'}
      </p>

      <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {figures.map((item, index) => (
          <div
            key={item.label}
            data-testid="kpi"
            className="ss-tint rounded-[18px] border border-line px-5 pt-5 pb-4"
            style={{ ['--tint' as string]: ['var(--ss-mint)', 'var(--ss-lilac)', 'var(--ss-peach)'][index] }}
          >
            <p data-testid="kpi-value" className="font-display text-[44px] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">
              <Figure value={item.value} />
            </p>
            <p className="mt-2 text-sm text-muted">{item.label}</p>
          </div>
        ))}
      </div>
    </article>
  )
}
