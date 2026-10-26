import type { ReactNode } from 'react'

import { LogoMark } from '@/components/layout/LogoMark'

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon ?? <LogoMark className="size-10 text-accent" />}
      <h3 className="mt-4 text-base leading-6 font-semibold">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-[360px] text-xs leading-[18px] text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
