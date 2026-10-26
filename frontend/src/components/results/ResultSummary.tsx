import { KpiTile } from '@/components/common/KpiTile'
import { Panel } from '@/components/common/Panel'
import { formatDate } from '@/lib/format'
import type { FinalReport } from '@/api/types'

export function ResultSummary({ report }: { report: FinalReport }) {
  const opportunities = report.all_opportunities ?? []
  const verified = opportunities.filter((item) => item.verification !== 'unverified').length
  const eligible = opportunities.filter((item) => item.eligibility === 'eligible').length
  const strong = report.top5?.length ?? 0
  const nearest = opportunities
    .filter((item) => item.deadline && !item.is_expired)
    .sort((a, b) => Date.parse(a.deadline as string) - Date.parse(b.deadline as string))[0]
  const unlockable = report.gaps?.[0]?.unlocks?.length ?? 0

  return (
    <Panel flush className="p-6" testId="result-summary">
      <p className="text-xl leading-7 font-semibold tracking-[-0.01em]">
        We verified <strong>{verified} opportunities</strong> from official sources —{' '}
        <strong>{strong} are strong matches</strong> for you.
      </p>
      <p className="mt-1 text-sm leading-[22px] text-muted">
        {nearest?.deadline
          ? `Nearest deadline: ${formatDate(nearest.deadline, 'd MMM yyyy')} (${nearest.name})`
          : 'Most deadlines are rolling — check each official page.'}
      </p>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiTile label="Verified" value={verified} tone="ok" />
        <KpiTile label="Eligible now" value={eligible} tone="accent" />
        <KpiTile label="Unlockable with one step" value={unlockable} tone="warn" />
      </div>
    </Panel>
  )
}
