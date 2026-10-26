import { useMemo, useState } from 'react'
import { CalendarPlus } from 'lucide-react'
import { format } from 'date-fns'

import { icsUrl } from '@/api/client'
import { DeadlineBadge } from '@/components/common/DeadlineBadge'
import { Panel } from '@/components/common/Panel'
import { Button } from '@/components/ui/button'
import { daysUntil } from '@/lib/format'
import type { FinalReport, Opportunity } from '@/api/types'

function DateBlock({ deadline }: { deadline: string }) {
  const date = new Date(deadline)
  return (
    <span className="flex h-14 w-14 flex-col items-center justify-center rounded-[10px] bg-subtle">
      <span className="text-xl leading-6 font-semibold tabular-nums">{format(date, 'd')}</span>
      <span className="text-[11px] leading-4 text-muted uppercase">{format(date, 'MMM')}</span>
    </span>
  )
}

function DeadlineRow({ opportunity }: { opportunity: Opportunity }) {
  return (
    <div className="grid grid-cols-[56px_1fr_auto] items-center gap-4 border-b border-line/60 py-3 last:border-0">
      {opportunity.deadline ? (
        <DateBlock deadline={opportunity.deadline} />
      ) : (
        <span className="flex h-14 w-14 items-center justify-center rounded-[10px] bg-subtle text-[11px] text-muted">
          TBD
        </span>
      )}
      <div className="min-w-0">
        <a
          href={opportunity.official_url}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-sm font-medium hover:text-accent"
        >
          {opportunity.name}
        </a>
        <p className="truncate text-xs leading-[18px] text-muted">
          {opportunity.provider_org} · {opportunity.country || '—'}
        </p>
        {opportunity.deadline_text && !opportunity.deadline ? (
          <p className="truncate text-xs text-muted">{opportunity.deadline_text}</p>
        ) : null}
      </div>
      <div className="flex flex-col items-end gap-1">
        <DeadlineBadge deadline={opportunity.deadline} />
        {opportunity.deadline ? (
          <span className="text-[11px] text-muted tabular-nums">
            {format(new Date(opportunity.deadline), 'd MMM yyyy')}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function DeadlineList({ runId, report }: { runId: string; report: FinalReport }) {
  const [showExpired, setShowExpired] = useState(false)
  const opportunities = report.all_opportunities ?? []

  const { upcoming, expired, rolling } = useMemo(() => {
    const dated = opportunities.filter((item) => Boolean(item.deadline))
    const sorted = [...dated].sort(
      (a, b) => Date.parse(a.deadline as string) - Date.parse(b.deadline as string),
    )
    return {
      upcoming: sorted.filter((item) => (daysUntil(item.deadline) ?? 0) >= 0),
      expired: sorted.filter((item) => (daysUntil(item.deadline) ?? 0) < 0),
      rolling: opportunities.filter((item) => !item.deadline),
    }
  }, [opportunities])

  const months = useMemo(() => {
    const groups = new Map<string, Opportunity[]>()
    for (const item of upcoming) {
      const key = format(new Date(item.deadline as string), 'MMMM yyyy')
      groups.set(key, [...(groups.get(key) ?? []), item])
    }
    return [...groups.entries()]
  }, [upcoming])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Sorted by date. Rolling programmes are listed last.</p>
        <div className="flex items-center gap-4">
          <Button
            variant={showExpired ? 'secondary' : 'ghost'}
            aria-pressed={showExpired}
            className="h-9 px-3 text-xs"
            onClick={() => setShowExpired((value) => !value)}
          >
            {showExpired ? 'Hide expired' : `Show expired${expired.length ? ` (${expired.length})` : ''}`}
          </Button>
          <Button
            className="h-9 gap-1.5"
            onClick={() => {
              window.location.href = icsUrl(runId)
            }}
          >
            <CalendarPlus className="size-4" strokeWidth={1.75} />
            Add all to calendar
          </Button>
        </div>
      </div>

      <Panel className="mt-3" flush>
        <div className="px-5">
          {months.length ? (
            months.map(([month, items]) => (
              <div key={month}>
                <p className="pt-4 pb-1 text-[11px] leading-4 font-semibold tracking-[0.08em] text-muted uppercase">
                  {month}
                </p>
                {items.map((item) => (
                  <DeadlineRow key={item.id || item.name} opportunity={item} />
                ))}
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-muted">
              No upcoming deadlines were found. Check the official pages before applying.
            </p>
          )}

          {showExpired && expired.length ? (
            <div>
              <p className="pt-4 pb-1 text-[11px] leading-4 font-semibold tracking-[0.08em] text-muted uppercase">
                Expired
              </p>
              {expired.map((item) => (
                <DeadlineRow key={item.id || item.name} opportunity={item} />
              ))}
            </div>
          ) : null}

          {rolling.length ? (
            <div>
              <p className="pt-4 pb-1 text-[11px] leading-4 font-semibold tracking-[0.08em] text-muted uppercase">
                Rolling / check official page
              </p>
              {rolling.map((item) => (
                <DeadlineRow key={item.id || item.name} opportunity={item} />
              ))}
            </div>
          ) : null}
        </div>
      </Panel>
    </div>
  )
}
