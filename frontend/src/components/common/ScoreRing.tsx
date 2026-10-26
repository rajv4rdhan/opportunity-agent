export function ScoreRing({ score }: { score: number }) {
  const value = Math.max(0, Math.min(100, Math.round(score)))
  const radius = 23
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="flex flex-col items-end">
      <svg width="56" height="56" viewBox="0 0 56 56" role="img" aria-label={`${value}% match`}>
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth="5"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 28 28)"
        />
        <text
          x="28"
          y="32"
          textAnchor="middle"
          className="fill-ink text-sm font-semibold"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {value}%
        </text>
      </svg>
      <span className="mt-0.5 text-xs leading-[18px] text-muted">match</span>
    </div>
  )
}
