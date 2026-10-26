import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'

import { coverage, type CoverageHint } from '@/lib/coverage'
import { cn } from '@/lib/cn'

const HINTS: Array<{ key: CoverageHint; label: string }> = [
  { key: 'degree', label: 'Degree' },
  { key: 'grades', label: 'Grades' },
  { key: 'goal', label: 'Goal' },
  { key: 'countries', label: 'Countries' },
  { key: 'budget', label: 'Budget' },
  { key: 'tests', label: 'Tests' },
  { key: 'projects', label: 'Projects' },
]

export function CoverageHints({
  text,
  hasFiles,
  className,
}: {
  text: string
  hasFiles: boolean
  className?: string
}) {
  const [result, setResult] = useState(() => coverage(text))

  useEffect(() => {
    const timer = setTimeout(() => setResult(coverage(text)), 250)
    return () => clearTimeout(timer)
  }, [text])

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)} aria-live="polite">
      <span className="mr-1 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">We picked up</span>
      {HINTS.map(({ key, label }) => {
        const covered = result[key]
        return (
          <span
            key={`${key}-${covered ? 'on' : 'off'}`}
            data-testid="coverage-hint"
            className={cn(
              'inline-flex h-6 items-center gap-1 rounded-[6px] border px-2 text-xs transition-colors',
              covered
                ? 'animate-in zoom-in-90 border-accent bg-accent text-on-accent duration-200'
                : 'border-line bg-surface text-muted',
            )}
          >
            {covered ? (
              <Check className="size-3" strokeWidth={2} />
            ) : (
              <span className="size-1 rounded-full bg-line-strong" aria-hidden="true" />
            )}
            {label}
            {!covered && hasFiles ? (
              <span className="italic opacity-70">· in resume?</span>
            ) : null}
          </span>
        )
      })}
    </div>
  )
}
