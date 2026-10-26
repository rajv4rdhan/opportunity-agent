import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

import type { FinalReport } from '@/api/types'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { DeadlineList } from '@/components/results/DeadlineList'
import { MatchCard } from '@/components/results/MatchCard'
import { OpportunityTable } from '@/components/results/OpportunityTable'
import { ResultSummary } from '@/components/results/ResultSummary'
import { SopDocument } from '@/components/results/SopDocument'
import { UnlockMore } from '@/components/results/UnlockMore'
import { cn } from '@/lib/cn'

const SECTIONS = [
  { id: 'summary', label: 'Summary' },
  { id: 'matches', label: 'Matches' },
  { id: 'all', label: 'All opportunities' },
  { id: 'unlock', label: 'Unlock more' },
  { id: 'deadlines', label: 'Deadlines' },
  { id: 'sop', label: 'SOP' },
  { id: 'swarm', label: 'How it ran' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

/** Scroll-spy: the section nearest the top third of the viewport is active. */
function useActiveSection(): SectionId {
  const [active, setActive] = useState<SectionId>('summary')
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActive(visible.target.id.replace('section-', '') as SectionId)
      },
      { rootMargin: '-20% 0px -65% 0px' },
    )
    for (const section of SECTIONS) {
      const element = document.getElementById(`section-${section.id}`)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [])
  return active
}

function jump(id: string) {
  document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function Section({
  id,
  index,
  title,
  subtitle,
  children,
}: {
  id: SectionId
  index: number
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <section id={`section-${id}`} className="scroll-mt-24">
      <header className="mb-6 flex items-end justify-between gap-4 border-b border-line pb-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] tracking-[0.14em] text-accent uppercase">
            {String(index).padStart(2, '0')} / {String(SECTIONS.length).padStart(2, '0')}
          </p>
          <h2 className="mt-1 text-[24px] leading-8 font-semibold tracking-[-0.02em]">{title}</h2>
        </div>
        {subtitle ? <p className="hidden text-sm text-muted sm:block">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  )
}

export function ResultsView({
  runId,
  report,
  revisions = 0,
  swarm,
}: {
  runId: string
  report: FinalReport
  revisions?: number
  swarm?: ReactNode
}) {
  const top5 = report.top5 ?? []
  const active = useActiveSection()
  const [showSwarm, setShowSwarm] = useState(false)

  return (
    <div id="results" className="grid gap-8 lg:grid-cols-[208px_minmax(0,1fr)] lg:gap-12">
      <nav
        aria-label="Dossier contents"
        className="ss-no-print ss-no-scrollbar sticky top-16 z-20 -mx-4 flex gap-1 overflow-x-auto border-b border-line bg-canvas/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:top-24 lg:mx-0 lg:flex-col lg:self-start lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0"
      >
        <p className="mb-2 hidden font-mono text-[11px] tracking-[0.14em] text-muted uppercase lg:block">Contents</p>
        {SECTIONS.map((section, index) => {
          const isActive = active === section.id
          return (
            <a
              key={section.id}
              href={`#section-${section.id}`}
              onClick={(event) => {
                event.preventDefault()
                jump(section.id)
              }}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'relative flex h-9 shrink-0 items-center gap-2.5 rounded-[8px] px-3 text-sm whitespace-nowrap transition-colors lg:rounded-none lg:border-l-2 lg:px-3',
                isActive
                  ? 'bg-accent text-on-accent lg:border-accent lg:bg-transparent lg:font-semibold lg:text-accent'
                  : 'text-muted hover:text-ink lg:border-line',
              )}
            >
              <span className="hidden font-mono text-[11px] opacity-70 lg:inline">{String(index + 1).padStart(2, '0')}</span>
              {section.label}
            </a>
          )
        })}
      </nav>

      <div className="flex min-w-0 flex-col gap-16">
        <section id="section-summary" className="scroll-mt-24">
          <ResultSummary report={report} />
        </section>

        <Section id="matches" index={2} title="Top matches" subtitle="Ranked by fit, funding and deadline">
          {top5.length ? (
            <div className="flex flex-col gap-5">
              {top5.map((match) => (
                <MatchCard key={match.opportunity.id || match.opportunity.name} match={match} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No strong matches yet"
              description="Check all opportunities, or use Unlock more to see what one improvement would change."
            />
          )}
        </Section>

        <Section id="all" index={3} title="All opportunities" subtitle="Everything the verifiers checked">
          <OpportunityTable report={report} />
        </Section>

        <Section id="unlock" index={4} title="Unlock more" subtitle="What one change would open up">
          <UnlockMore runId={runId} report={report} />
        </Section>

        <Section id="deadlines" index={5} title="Deadlines" subtitle="Add them to your calendar">
          <DeadlineList runId={runId} report={report} />
        </Section>

        <Section id="sop" index={6} title="Statement of purpose" subtitle="Drafted, then fact-checked">
          <SopDocument runId={runId} report={report} revisions={revisions} />
        </Section>

        {swarm ? (
          <Section id="swarm" index={7} title="How the swarm worked" subtitle="The full run, agent by agent">
            <Button
              variant="outline"
              className="ss-no-print h-10 gap-2"
              onClick={() => setShowSwarm((value) => !value)}
              aria-expanded={showSwarm}
            >
              <ChevronDown className={cn('size-4 transition-transform', showSwarm && 'rotate-180')} />
              {showSwarm ? 'Hide the swarm' : 'Show the swarm'}
            </Button>
            {showSwarm ? <div className="mt-6">{swarm}</div> : null}
          </Section>
        ) : null}
      </div>
    </div>
  )
}
