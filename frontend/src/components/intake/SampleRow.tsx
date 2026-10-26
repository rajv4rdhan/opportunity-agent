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
    <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
      <span className="text-muted">Try a sample:</span>
      <div className="flex flex-wrap items-center justify-center gap-1">
        {samples.map((sample) => (
          <Button
            key={sample.name}
            type="button"
            variant="ghost"
            className="h-8 px-2 text-sm text-ink hover:bg-subtle"
            onClick={() => onPick(sample)}
          >
            {sample.label}
          </Button>
        ))}
      </div>
      <Separator orientation="vertical" className="h-4" />
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
