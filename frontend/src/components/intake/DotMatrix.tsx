import { useEffect, useState } from 'react'

import { cn } from '@/lib/cn'

export type MatrixMode = 'idle' | 'typing' | 'listening' | 'busy'

const ROWS = 7
const MID = 3

/** Height (0–3) of each column for the current frame. */
function heights(columns: number, mode: MatrixMode, tick: number, level: number): number[] {
  return Array.from({ length: columns }, (_, column) => {
    if (mode === 'listening') {
      // Pseudo-random but stable within a frame: looks like a live equaliser.
      const seed = Math.sin(column * 12.9898 + tick * 78.233) * 43758.5453
      return Math.round((seed - Math.floor(seed)) * 3)
    }
    if (mode === 'busy') {
      const distance = Math.abs(((tick * 2) % (columns + 8)) - 4 - column)
      return Math.max(0, 3 - distance)
    }
    const wave = Math.sin(column / 2.2 + tick * 0.35) * 0.5 + 0.5
    const cap = mode === 'typing' ? 1 + Math.min(2, level) : 1
    return Math.round(wave * cap)
  })
}

/**
 * The speaker-grille display on the composer. It idles with a soft wave, rises
 * as more of your profile is covered, dances while listening and sweeps while
 * the run starts.
 */
export function DotMatrix({
  mode,
  level = 0,
  columns = 18,
  className,
}: {
  mode: MatrixMode
  level?: number
  columns?: number
  className?: string
}) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const speed = mode === 'listening' ? 110 : mode === 'busy' ? 70 : 420
    const timer = setInterval(() => setTick((value) => value + 1), speed)
    return () => clearInterval(timer)
  }, [mode])

  const columnHeights = heights(columns, mode, tick, level)

  return (
    <div
      aria-hidden="true"
      className={cn('ss-matrix', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, 5px)`, gridTemplateRows: `repeat(${ROWS}, 5px)` }}
    >
      {Array.from({ length: ROWS }).flatMap((_, row) =>
        columnHeights.map((height, column) => (
          <span key={`${row}-${column}`} className={Math.abs(row - MID) <= height ? 'on' : undefined} />
        )),
      )}
    </div>
  )
}
