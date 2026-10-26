import { useEffect, useRef, useState } from 'react'

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Animates a number to `target` (ease-out cubic). With `fromZero`, the first
 * render starts at 0 so the value rolls up when it appears.
 */
export function useCountUp(target: number, duration = 900, fromZero = false): number {
  const initial = fromZero && !reducedMotion() ? 0 : target
  const [value, setValue] = useState(initial)
  const fromRef = useRef(initial)
  const frameRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    if (from === target) return
    if (reducedMotion()) {
      fromRef.current = target
      setValue(target)
      return
    }
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = from + (target - from) * eased
      setValue(next)
      fromRef.current = next
      if (progress < 1) frameRef.current = requestAnimationFrame(step)
      else fromRef.current = target
    }
    frameRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  return value
}
