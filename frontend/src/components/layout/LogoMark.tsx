export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={className}
      width="20"
      height="20"
      fill="none"
    >
      <line
        x1="6"
        y1="13"
        x2="10"
        y2="6"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.4"
      />
      <line
        x1="14"
        y1="13"
        x2="10"
        y2="6"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.4"
      />
      <circle cx="6" cy="13" r="3" fill="currentColor" />
      <circle cx="14" cy="13" r="3" fill="currentColor" />
      <circle cx="10" cy="6" r="3" fill="currentColor" />
    </svg>
  )
}
