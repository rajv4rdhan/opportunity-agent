import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'err'

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'border-line bg-subtle text-muted',
  accent: 'border-accent/30 bg-accent-soft text-accent',
  ok: 'border-ok/30 bg-ok-soft text-ok',
  warn: 'border-warn/30 bg-warn-soft text-warn',
  err: 'border-err/30 bg-err-soft text-err',
}

const STATUS: Record<string, { label: string; tone: Tone; pulse?: boolean }> = {
  queued: { label: 'Queued', tone: 'neutral' },
  running: { label: 'Running', tone: 'accent', pulse: true },
  waiting_input: { label: 'Needs input', tone: 'warn' },
  waiting: { label: 'Waiting', tone: 'warn' },
  finished: { label: 'Finished', tone: 'ok' },
  failed: { label: 'Failed', tone: 'err' },
  fetching: { label: 'Fetching', tone: 'accent', pulse: true },
  reading: { label: 'Reading', tone: 'accent' },
  verified: { label: 'Verified', tone: 'ok' },
  rejected: { label: 'Rejected', tone: 'neutral' },
  done: { label: 'Done', tone: 'ok' },
  skipped: { label: 'Skipped', tone: 'neutral' },
  eligible: { label: 'Eligible', tone: 'ok' },
  partial: { label: 'Partial', tone: 'warn' },
  not_eligible: { label: 'Not eligible', tone: 'err' },
  verified_official: { label: 'Official', tone: 'ok' },
  third_party: { label: 'Third party', tone: 'warn' },
  unverified: { label: 'Unverified', tone: 'neutral' },
  idle: { label: 'Idle', tone: 'neutral' },
}

export function StatusPill({
  status,
  label,
  tone,
  icon,
  className,
}: {
  status?: string
  label?: string
  tone?: Tone
  icon?: ReactNode
  className?: string
}) {
  const mapped = status ? STATUS[status] : undefined
  const resolvedTone = tone ?? mapped?.tone ?? 'neutral'
  const text = label ?? mapped?.label ?? (status ? status.replaceAll('_', ' ') : 'Unknown')
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-xs font-medium',
        TONE_CLASSES[resolvedTone],
        className,
      )}
    >
      {icon ?? (
        <span
          className={cn('size-1.5 rounded-full bg-current', mapped?.pulse && 'animate-pulse')}
          aria-hidden="true"
        />
      )}
      {text}
    </span>
  )
}
