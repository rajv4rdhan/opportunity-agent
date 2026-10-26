import type { ReactNode } from 'react'

import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/cn'

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
  scroll = false,
  flush = false,
  testId = 'panel',
}: {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  scroll?: boolean
  flush?: boolean
  testId?: string
}) {
  return (
    <section
      data-testid={testId}
      className={cn(
        'flex h-full min-h-0 flex-col rounded-[var(--radius-card)] border border-line bg-surface shadow-card',
        className,
      )}
    >
      {title ? (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-line px-5 pt-4 pb-3">
          <div className="min-w-[180px] flex-1">
            {typeof title === 'string' ? (
              <h2 className="truncate text-base leading-6 font-semibold" title={title}>
                {title}
              </h2>
            ) : (
              title
            )}
            {subtitle ? <p className="mt-0.5 text-xs leading-[18px] text-muted">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      {scroll ? (
        <ScrollArea className={cn('min-h-0 flex-1', bodyClassName)}>
          <div className="px-5 py-3">{children}</div>
        </ScrollArea>
      ) : (
        <div className={cn('min-h-0 flex-1', bodyClassName)}>
          {flush ? children : <div className="px-5 py-3">{children}</div>}
        </div>
      )}
    </section>
  )
}
