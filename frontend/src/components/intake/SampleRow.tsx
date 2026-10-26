import { SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { SampleInfo } from '@/api/types'

export function SampleRow({
  samples,
  onPick,
  onAdvanced,
}: {
  samples: SampleInfo[]
  onPick: (sample: SampleInfo) => void
  onAdvanced: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="text-muted">Try a sample:</span>
      <div className="flex flex-wrap items-center gap-1">
        {samples.map((sample) => (
          <Button
            key={sample.name}
            type="button"
            variant="ghost"
            className="h-8 rounded-[8px] px-2.5 text-sm font-medium text-accent hover:bg-accent-soft hover:text-accent"
            onClick={() => onPick(sample)}
          >
            {sample.label}
          </Button>
        ))}
      </div>
      <Separator orientation="vertical" className="hidden h-4 sm:block" />
      <Button
        type="button"
        variant="ghost"
        className="h-8 gap-1.5 px-2 text-sm text-muted hover:bg-subtle hover:text-ink"
        onClick={onAdvanced}
      >
        <SlidersHorizontal className="size-3.5" strokeWidth={1.75} />
        Advanced
      </Button>
    </div>
  )
}
