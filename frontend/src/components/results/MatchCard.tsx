import { useState } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { DeadlineBadge, DeadlineText } from '@/components/common/DeadlineBadge'
import { ScoreRing } from '@/components/common/ScoreRing'
import { SourceChip } from '@/components/common/SourceChip'
import { StatusPill } from '@/components/common/StatusPill'
import { Button } from '@/components/ui/button'
import { RequirementList } from '@/components/results/RequirementList'
import type { TopMatch } from '@/api/types'

function whyText(match: TopMatch): string {
  return (match.why_it_fits || '').trim() || (match.opportunity.fit_reasons ?? []).join('; ')
}

export function MatchCard({ match }: { match: TopMatch }) {
  const opportunity = match.opportunity
  const [expandedWhy, setExpandedWhy] = useState(false)
  const [sections, setSections] = useState<Set<string>>(new Set())
  const why = whyText(match)
  const applyUrl = opportunity.application_url || opportunity.official_url
  const requirements = opportunity.requirements ?? []
  const sources = opportunity.sources ?? []

  function toggleSection(section: string) {
    setSections((current) => {
      const next = new Set(current)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  return (
    <article
      data-testid="match-card"
      className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-card"
    >
      <div className="grid grid-cols-[40px_minmax(0,1fr)_72px] gap-x-4 sm:grid-cols-[56px_minmax(0,1fr)_120px]">
        <p className="text-2xl leading-8 font-semibold text-muted tabular-nums">
          {String(match.rank).padStart(2, '0')}
        </p>
        <div className="min-w-0">
          <h3
            className="line-clamp-2 text-lg leading-6 font-semibold sm:truncate"
            title={opportunity.name}
          >
            {opportunity.name}
          </h3>
          <p className="mt-0.5 text-xs leading-[18px] text-muted">
            {opportunity.provider_org} · {opportunity.country || '—'}
          </p>
        </div>
        <div className="row-span-1 flex justify-end">
          <ScoreRing score={opportunity.score} />
        </div>

        <div className="col-span-3 mt-4 grid grid-cols-2 divide-x divide-y divide-line rounded-[10px] border border-line bg-subtle/50 sm:grid-cols-4 sm:divide-y-0">
          <div className="min-w-0 px-4 py-3">
            <p className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-muted uppercase">
              Funding
            </p>
            <p className="truncate text-sm font-medium capitalize">
              {opportunity.funding_type.replaceAll('_', ' ')}
            </p>
            {opportunity.funding_text ? (
              <p className="line-clamp-2 text-xs leading-[18px] text-muted" title={opportunity.funding_text}>
                {opportunity.funding_text}
              </p>
            ) : null}
          </div>
          <div className="min-w-0 px-4 py-3">
            <p className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-muted uppercase">
              Deadline
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <DeadlineText deadline={opportunity.deadline} />
              <DeadlineBadge deadline={opportunity.deadline} />
            </div>
            {opportunity.deadline_text ? (
              <p className="truncate text-xs text-muted" title={opportunity.deadline_text}>
                {opportunity.deadline_text}
              </p>
            ) : null}
          </div>
          <div className="min-w-0 px-4 py-3">
            <p className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-muted uppercase">
              Eligibility
            </p>
            <StatusPill status={opportunity.eligibility} />
          </div>
          <div className="min-w-0 px-4 py-3">
            <p className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-muted uppercase">
              Source
            </p>
            <StatusPill status={opportunity.verification} />
          </div>
        </div>

        {why ? (
          <div className="col-span-3 mt-4">
            <p className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-muted uppercase">
              Why you
            </p>
            <div
              className={
                expandedWhy
                  ? 'mt-1 text-sm leading-6'
                  : 'mt-1 line-clamp-3 text-sm leading-6'
              }
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="m-0">{children}</p>,
                }}
              >
                {why}
              </ReactMarkdown>
            </div>
            {why.length > 260 ? (
              <button
                type="button"
                onClick={() => setExpandedWhy((value) => !value)}
                className="mt-1 inline-flex h-8 items-center text-xs text-accent"
              >
                {expandedWhy ? 'Show less' : 'Show more'}
              </button>
            ) : null}
          </div>
        ) : null}

        {opportunity.missing?.length ? (
          <p className="col-span-3 mt-2 text-xs leading-[18px] text-warn">
            Missing: {opportunity.missing.join('; ')}
          </p>
        ) : null}

        <div className="col-span-3 mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <SectionToggle
              label={`Requirements (${requirements.length})`}
              open={sections.has('requirements')}
              onClick={() => toggleSection('requirements')}
            />
            <SectionToggle
              label="How to apply"
              open={sections.has('apply')}
              onClick={() => toggleSection('apply')}
            />
            <SectionToggle
              label={`Sources (${sources.length})`}
              open={sections.has('sources')}
              onClick={() => toggleSection('sources')}
            />
          </div>
          {applyUrl ? (
            <Button asChild className="h-9">
              <a href={applyUrl} target="_blank" rel="noreferrer">
                Apply <ExternalLink className="size-3.5" strokeWidth={1.75} />
              </a>
            </Button>
          ) : null}
        </div>

        {sections.has('requirements') ? (
          <div className="col-span-3 mt-3 border-t border-line pt-3">
            <RequirementList opportunity={opportunity} />
          </div>
        ) : null}

        {sections.has('apply') ? (
          <div className="col-span-3 mt-3 border-t border-line pt-3">
            {opportunity.how_to_apply?.length ? (
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {opportunity.how_to_apply.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">See the official page for application steps.</p>
            )}
            {opportunity.required_documents?.length ? (
              <div className="mt-3">
                <p className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-muted uppercase">
                  Documents
                </p>
                <p className="text-sm">{opportunity.required_documents.join(' · ')}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {sections.has('sources') ? (
          <div className="col-span-3 mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
            {sources.map((source, index) => (
              <SourceChip
                key={`${source.url}-${index}`}
                source={source}
                verification={opportunity.verification}
              />
            ))}
            {sources.length === 0 ? <p className="text-sm text-muted">No sources recorded.</p> : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}

function SectionToggle({
  label,
  open,
  onClick,
}: {
  label: string
  open: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className="inline-flex h-8 items-center gap-1 rounded-[var(--radius-control)] px-2 text-xs text-muted hover:bg-subtle hover:text-ink"
    >
      <ChevronDown className={open ? 'size-3.5 rotate-180' : 'size-3.5'} strokeWidth={1.75} />
      {label}
    </button>
  )
}
