import { useNavigate } from 'react-router'
import { Play, RotateCcw, X } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function ReplayBar({
  runId,
  speed,
  onSpeed,
  onRestart,
  done,
}: {
  runId: string
  speed: number
  onSpeed: (speed: number) => void
  onRestart: () => void
  done: boolean
}) {
  const navigate = useNavigate()
  return (
    <div className="sticky top-14 z-30 h-12 border-b border-accent/20 bg-accent-soft">
      <div className="mx-auto flex h-full w-full max-w-[1280px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-accent/30 bg-surface px-2 text-xs font-medium text-accent">
          <Play className="size-3" strokeWidth={2} />
          Replay {done ? 'complete' : `×${speed}`}
        </span>
        <div className="flex items-center gap-1">
          {[1, 5, 20].map((value) => (
            <Button
              key={value}
              variant="ghost"
              onClick={() => onSpeed(value)}
              className={
                value === speed
                  ? 'h-8 bg-surface px-2 text-xs text-accent'
                  : 'h-8 px-2 text-xs text-muted hover:bg-surface hover:text-ink'
              }
            >
              {value}×
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          onClick={onRestart}
          className="h-8 gap-1.5 px-2 text-xs text-muted hover:bg-surface hover:text-ink"
        >
          <RotateCcw className="size-3.5" strokeWidth={1.75} />
          <span className="hidden sm:inline">Restart</span>
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigate(`/runs/${runId}`)}
          aria-label="Exit replay"
          className="ml-auto h-8 gap-1 px-2 text-xs text-muted hover:bg-surface hover:text-ink"
        >
          <X className="size-3.5" strokeWidth={1.75} />
          <span className="hidden sm:inline">Exit replay</span>
        </Button>
      </div>
    </div>
  )
}
