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
    <div className={cn('flex flex-wrap justify-center gap-2', className)} aria-live="polite">
      {HINTS.map(({ key, label }) => {
        const covered = result[key]
        return (
          <span
            key={key}
            data-testid="coverage-hint"
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs',
              covered
                ? 'border-ok/30 bg-ok-soft text-ok'
                : 'border-line text-muted',
            )}
          >
            {covered ? (
              <Check className="size-3" strokeWidth={2} />
            ) : (
              <span className="size-1.5 rounded-full bg-line-strong" aria-hidden="true" />
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
