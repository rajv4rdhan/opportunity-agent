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
    <div className={cn('mb-8 flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="truncate text-[28px] leading-9 font-semibold tracking-[-0.01em]">{title}</h1>
        {subtitle ? <p className="mt-1 text-xs leading-[18px] text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}
