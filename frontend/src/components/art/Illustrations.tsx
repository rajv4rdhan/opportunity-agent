/**
 * Flat pastel illustrations with a dark outline, in the style of the
 * marketing pages. Each is a 160×120 SVG and inherits size from className.
 */

const INK = '#2e2363'
const LILAC = '#cbbcfb'
const PEACH = '#fbd3ae'
const MINT = '#a8dcb6'
const PINK = '#f7b8d2'
const SKY = '#b9cdf8'

const line = { stroke: INK, strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function Sparkle({ x, y, s = 1, fill = LILAC }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <path
      d={`M ${x} ${y - 7 * s} Q ${x + 1.5 * s} ${y - 1.5 * s} ${x + 7 * s} ${y} Q ${x + 1.5 * s} ${y + 1.5 * s} ${x} ${y + 7 * s} Q ${x - 1.5 * s} ${y + 1.5 * s} ${x - 7 * s} ${y} Q ${x - 1.5 * s} ${y - 1.5 * s} ${x} ${y - 7 * s} Z`}
      fill={fill}
      {...line}
      strokeWidth={2}
    />
  )
}

function Dashes({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  const d = flip ? -1 : 1
  return (
    <g {...line} strokeWidth={2} stroke={PEACH}>
      <path d={`M ${x} ${y} l ${8 * d} -4`} />
      <path d={`M ${x} ${y + 8} l ${9 * d} 0`} />
      <path d={`M ${x} ${y + 16} l ${8 * d} 4`} />
    </g>
  )
}

type ArtProps = { className?: string }

/** Laptop with a graduation cap: computing / engineering. */
export function LaptopCapArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden="true">
      <ellipse cx="80" cy="104" rx="56" ry="6" fill={LILAC} opacity="0.5" />
      <rect x="40" y="44" width="80" height="50" rx="6" fill={SKY} {...line} />
      <rect x="47" y="51" width="66" height="36" rx="3" fill="#fff" {...line} strokeWidth={2} />
      <path d="M54 62h22M54 70h34M54 78h16" {...line} stroke={LILAC} strokeWidth={3} />
      <path d="M30 94h100l-6 8H36z" fill={LILAC} {...line} />
      <path d="M60 30l26-12 26 12-26 12z" fill="#7a5fe6" {...line} />
      <path d="M72 36v9c9 6 19 6 28 0v-9" fill="#9c84f2" {...line} />
      <path d="M112 30v14" {...line} />
      <circle cx="112" cy="47" r="3" fill={PEACH} {...line} strokeWidth={2} />
      <Sparkle x={22} y={40} fill={PEACH} />
      <Sparkle x={138} y={58} s={0.8} fill={MINT} />
      <Dashes x={128} y={18} />
    </svg>
  )
}

/** Microscope with a DNA strand: life sciences. */
export function MicroscopeArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden="true">
      <ellipse cx="80" cy="104" rx="52" ry="6" fill={MINT} opacity="0.5" />
      <path d="M48 100h56" {...line} />
      <path d="M56 100c0-18 12-30 28-30" fill="none" {...line} />
      <rect x="70" y="20" width="16" height="44" rx="5" transform="rotate(-22 78 42)" fill={MINT} {...line} />
      <rect x="62" y="58" width="34" height="9" rx="3" fill={LILAC} {...line} />
      <circle cx="96" cy="78" r="8" fill={PEACH} {...line} />
      <rect x="52" y="92" width="48" height="9" rx="3" fill={SKY} {...line} />
      <g {...line} fill="none">
        <path d="M118 22c10 10-10 20 0 30s-10 20 0 30" stroke="#7a5fe6" />
        <path d="M134 22c-10 10 10 20 0 30s10 20 0 30" stroke={PINK} />
        <path d="M121 30h10M121 46h10M121 62h10M121 78h10" stroke={INK} strokeWidth={2} />
      </g>
      <Sparkle x={30} y={36} fill={PINK} />
      <Sparkle x={44} y={18} s={0.6} fill={LILAC} />
    </svg>
  )
}

/** Briefcase with a rising chart: business / MBA. */
export function BriefcaseArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden="true">
      <ellipse cx="80" cy="104" rx="54" ry="6" fill={PEACH} opacity="0.6" />
      <rect x="40" y="48" width="80" height="52" rx="8" fill={PEACH} {...line} />
      <path d="M64 48v-8a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v8" fill="none" {...line} />
      <path d="M40 66h80" {...line} />
      <rect x="72" y="60" width="16" height="12" rx="3" fill={LILAC} {...line} />
      <g {...line}>
        <rect x="118" y="34" width="10" height="26" rx="2" fill={MINT} />
        <rect x="132" y="22" width="10" height="38" rx="2" fill={SKY} />
        <rect x="104" y="44" width="10" height="16" rx="2" fill={PINK} />
      </g>
      <path d="M100 30l14-10 12 6 18-14" fill="none" {...line} stroke="#7a5fe6" />
      <path d="M138 12h6v6" fill="none" {...line} stroke="#7a5fe6" />
      <Sparkle x={26} y={44} fill={LILAC} />
      <Dashes x={22} y={64} flip />
    </svg>
  )
}

/** Small friendly robot: robotics / engineering research. */
export function RobotArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden="true">
      <ellipse cx="80" cy="106" rx="46" ry="5" fill={SKY} opacity="0.6" />
      <path d="M80 18v10" {...line} />
      <circle cx="80" cy="15" r="5" fill={PINK} {...line} />
      <rect x="52" y="28" width="56" height="38" rx="12" fill={SKY} {...line} />
      <rect x="60" y="36" width="40" height="22" rx="8" fill="#fff" {...line} strokeWidth={2} />
      <circle cx="72" cy="47" r="4" fill={INK} />
      <circle cx="88" cy="47" r="4" fill={INK} />
      <path d="M46 46h6M108 46h6" {...line} />
      <rect x="58" y="70" width="44" height="30" rx="8" fill={LILAC} {...line} />
      <circle cx="80" cy="85" r="6" fill={PEACH} {...line} strokeWidth={2} />
      <path d="M58 78c-12 0-16 8-16 14M102 78c12 0 16 8 16 14" fill="none" {...line} />
      <Sparkle x={130} y={30} fill={MINT} />
      <Sparkle x={28} y={60} s={0.8} fill={PEACH} />
    </svg>
  )
}

/** Stack of papers labelled SOP: the drafted application. */
export function SopStackArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden="true">
      <rect x="58" y="14" width="66" height="84" rx="8" fill={MINT} {...line} transform="rotate(8 91 56)" />
      <rect x="52" y="16" width="66" height="84" rx="8" fill={PEACH} {...line} transform="rotate(3 85 58)" />
      <path d="M44 20a6 6 0 0 1 6-6h42l18 18v66a6 6 0 0 1-6 6H50a6 6 0 0 1-6-6z" fill={SKY} {...line} />
      <path d="M92 14v18h18" fill="#fff" {...line} />
      <rect x="58" y="50" width="36" height="20" rx="10" fill="#fff" {...line} strokeWidth={2} />
      <text x="76" y="64" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fontWeight="700" fill={INK}>
        SOP
      </text>
      <path d="M56 82h40M56 90h28" {...line} stroke={INK} strokeWidth={2} opacity="0.5" />
      <Sparkle x={130} y={28} fill={PINK} />
    </svg>
  )
}

/** Globe with a paper plane: study abroad. */
export function GlobeArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden="true">
      <circle cx="74" cy="62" r="36" fill={SKY} {...line} />
      <path d="M50 44c10 4 14 12 10 20s4 14 14 14M90 34c-6 8-2 14 6 16s10 10 6 18" fill={MINT} {...line} strokeWidth={2} />
      <ellipse cx="74" cy="62" rx="52" ry="14" fill="none" {...line} stroke="#7a5fe6" transform="rotate(-18 74 62)" />
      <path d="M112 22l26-8-10 24-6-8z" fill="#fff" {...line} />
      <path d="M122 30l-6 8" {...line} />
      <Sparkle x={24} y={28} fill={PEACH} />
      <Sparkle x={134} y={84} s={0.7} fill={PINK} />
    </svg>
  )
}

export const PROFILE_ART = [LaptopCapArt, MicroscopeArt, BriefcaseArt, RobotArt]
