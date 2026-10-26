import { StatusPill, type Tone } from '@/components/common/StatusPill'
import { daysUntil, formatDate } from '@/lib/format'

export function DeadlineBadge({ deadline }: { deadline: string | null | undefined }) {
  if (!deadline) return <StatusPill tone="neutral" label="Rolling" />
  const remaining = daysUntil(deadline)
  if (remaining === null) return <StatusPill tone="neutral" label="Unknown" />
  if (remaining < 0) return <StatusPill tone="neutral" label={`Expired ${-remaining}d ago`} />
  const tone: Tone = remaining < 14 ? 'err' : remaining < 45 ? 'warn' : 'ok'
  return <StatusPill tone={tone} label={`${remaining}d left`} />
}

export function DeadlineText({ deadline }: { deadline: string | null | undefined }) {
  return <span className="tabular-nums">{formatDate(deadline, 'd MMM yyyy')}</span>
}
