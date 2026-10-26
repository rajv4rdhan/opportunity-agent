import { differenceInCalendarDays, format, formatDistanceToNow } from 'date-fns'

export function pad2(value: number): string {
  return String(Math.max(0, Math.floor(value))).padStart(2, '0')
}

/** Elapsed clock used by the run header: 01:37, 10:12. */
export function formatClock(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.floor(seconds ?? 0))
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`
}

/** Human duration used in result summaries: 42s, 10m 12s. */
export function formatDuration(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.floor(seconds ?? 0))
  if (total < 60) return `${total}s`
  return `${Math.floor(total / 60)}m ${pad2(total % 60)}s`
}

export function formatMoney(value: number | null | undefined): string {
  return `$${(value ?? 0).toFixed(2)}`
}

export function formatDate(value: string | Date | null | undefined, pattern = 'd MMM yyyy'): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return format(date, pattern)
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return formatDistanceToNow(date, { addSuffix: true })
}

export function daysUntil(value: string | Date | null | undefined): number | null {
  if (!value) return null
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return null
  return differenceInCalendarDays(date, new Date())
}

export function initials(name: string | null | undefined): string {
  const words = (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  if (words.length === 0) return '?'
  return words.map((word) => word[0]?.toUpperCase() ?? '').join('')
}

export function shortId(id: string | null | undefined): string {
  return (id ?? '').slice(0, 8)
}
