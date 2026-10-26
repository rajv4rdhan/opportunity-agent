import { useCountUp } from '@/lib/useCountUp'
import { useInView } from '@/lib/useInView'
import { cn } from '@/lib/cn'

const LOG = [
  { time: '00:00', who: 'Profile Analyst', what: 'Reads your resume, transcript and words into one profile.' },
  { time: '00:15', who: 'GitHub Enricher', what: 'Finds projects your resume forgot to mention.' },
  { time: '00:50', who: 'Planner', what: 'Writes ten targeted searches for your degree and countries.' },
  { time: '01:10', who: 'Scout', what: 'Collects thirty-plus candidate pages from three search engines.' },
  { time: '01:30', who: 'Verifiers × 15', what: 'Open official pages in parallel and quote every rule.' },
  { time: '08:00', who: 'Matcher & Ranker', what: 'Score fit, funding and deadlines; pick your top five.' },
  { time: '10:00', who: 'SOP Writer & Critic', what: 'Draft your statement of purpose and fact-check it.' },
]

/** "A search, minute by minute": a timestamped run log that reveals line by line. */
export function HowItWorks() {
  const { ref, inView } = useInView<HTMLOListElement>(0.15)

  return (
    <section className="grid gap-10 border-t border-line pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-16">
      <div>
        <p className="font-mono text-[11px] tracking-[0.14em] text-accent uppercase">How a search runs</p>
        <h2 className="mt-3 text-[34px] leading-[40px] font-semibold tracking-[-0.025em] max-sm:text-[28px] max-sm:leading-9">
          Ten minutes,
          <br />
          start to finish.
        </h2>
        <p className="mt-4 max-w-[400px] text-[15px] leading-7 text-muted">
          Eleven agents pass work to each other. You can watch every step live — and every claim in
          your results links back to the page it came from.
        </p>
      </div>

      <ol ref={ref} className="relative">
        <span aria-hidden="true" className="absolute top-2 bottom-2 left-[71px] w-px bg-line" />
        {LOG.map((row, index) => (
          <li
            key={row.time}
            className={cn('relative grid grid-cols-[56px_32px_minmax(0,1fr)] items-start py-3', inView ? 'ss-rise' : 'opacity-0')}
            style={{ ['--i' as string]: index }}
          >
            <span className="pt-0.5 font-mono text-[13px] text-muted tabular-nums">{row.time}</span>
            <span className="flex justify-center pt-1.5">
              <span
                className={cn(
                  'size-2.5 rounded-full border-2',
                  index === LOG.length - 1 ? 'border-accent bg-accent' : 'border-accent bg-surface',
                )}
              />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] leading-6 font-semibold">{row.who}</span>
              <span className="block text-sm leading-6 text-muted">{row.what}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

const FIGURES = [
  { value: 11, suffix: '', label: 'specialised agents', note: 'each with one job' },
  { value: 3, suffix: '', label: 'search engines', note: 'with automatic fallback' },
  { value: 15, suffix: '', label: 'pages read at once', note: 'by parallel verifiers' },
  { value: 4, suffix: '', label: 'fallbacks per page', note: 'cache, reader, scraper, browser' },
]

function Figure({ value, suffix, run }: { value: number; suffix: string; run: boolean }) {
  const shown = useCountUp(run ? value : 0, 1100)
  return (
    <span className="tabular-nums">
      {Math.round(shown)}
      {suffix}
    </span>
  )
}

/** Four plain figures in a ruled row. */
export function FiguresRow() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3)
  return (
    <div ref={ref} className="grid grid-cols-2 border-t border-line lg:grid-cols-4">
      {FIGURES.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            'border-b border-line py-8 lg:border-b-0',
            index % 2 === 1 && 'border-l border-line pl-6',
            index >= 1 && 'lg:border-l lg:pl-6',
          )}
        >
          <p className="text-[52px] leading-none font-semibold tracking-[-0.03em] text-accent max-sm:text-[40px]">
            <Figure value={item.value} suffix={item.suffix} run={inView} />
          </p>
          <p className="mt-3 text-[15px] font-semibold">{item.label}</p>
          <p className="text-sm text-muted">{item.note}</p>
        </div>
      ))}
    </div>
  )
}
