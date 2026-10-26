import type { ReactNode } from 'react'

import { Panel } from '@/components/common/Panel'
import { cn } from '@/lib/cn'

export function KpiTile({
  label,
  value,
  tone,
  className,
}: {
  label: string
  value: ReactNode
  tone?: 'warn' | 'ok' | 'err' | 'accent'
  className?: string
}) {
  const color =
    tone === 'warn'
      ? 'text-warn'
      : tone === 'ok'
        ? 'text-ok'
        : tone === 'err'
          ? 'text-err'
          : tone === 'accent'
            ? 'text-accent'
            : 'text-ink'
  return (
    <Panel className={cn('p-0', className)} testId="kpi">
      <div className="px-4 py-3">
        <p className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-muted uppercase">
          {label}
        </p>
        <p
          data-testid="kpi-value"
          className={cn('mt-1 text-2xl font-semibold tabular-nums', color)}
        >
          {value}
        </p>
      </div>
    </Panel>
  )
}
