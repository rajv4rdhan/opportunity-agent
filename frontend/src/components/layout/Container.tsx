import { cn } from '@/lib/cn'

export function Container({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-testid="container"
      className={cn('mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8', className)}
    >
      {children}
    </div>
  )
}
