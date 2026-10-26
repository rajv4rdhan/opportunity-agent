import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-10 flex items-end justify-between gap-4 border-b border-line pb-6', className)}>
      <div className="min-w-0">
        <h1 className="truncate text-[36px] leading-[44px] font-semibold tracking-[-0.03em]" title={title}>
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}
