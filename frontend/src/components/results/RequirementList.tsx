import { CheckCircle2, HelpCircle, Info, XCircle } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { domainOf } from '@/lib/url'
import type { Opportunity, Requirement } from '@/api/types'

function sourceFor(opportunity: Opportunity, requirement: Requirement) {
  const sources = opportunity.sources ?? []
  return sources.find((source) => requirement.quote && source.quote === requirement.quote) ?? sources[0]
}

export function RequirementList({ opportunity }: { opportunity: Opportunity }) {
  const requirements = opportunity.requirements ?? []
  if (requirements.length === 0) {
    return (
      <p className="py-2 text-xs text-muted">No requirements were extracted from the official page.</p>
    )
  }
  return (
    <div>
      {requirements.map((requirement, index) => {
        const Icon =
          requirement.met === 'yes'
            ? CheckCircle2
            : requirement.met === 'no'
              ? XCircle
              : HelpCircle
        const color =
          requirement.met === 'yes' ? 'text-ok' : requirement.met === 'no' ? 'text-err' : 'text-muted'
        const source = sourceFor(opportunity, requirement)
        const domain = source ? domainOf(source.url) : ''
        return (
          <div
            key={`${requirement.key}-${index}`}
            className="grid grid-cols-[20px_1fr_auto] items-start gap-3 border-b border-line/60 py-2 last:border-0"
          >
            <Icon className={`mt-0.5 size-4 ${color}`} strokeWidth={1.75} />
            <div className="min-w-0">
              <p className="text-sm">{requirement.description}</p>
              {requirement.evidence ? (
                <p className="text-xs leading-[18px] text-muted">{requirement.evidence}</p>
              ) : null}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Show source quote"
                  className="mt-0.5 text-muted hover:text-ink"
                >
                  <Info className="size-3.5" strokeWidth={1.75} />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[320px]">
                <p className="italic">“{requirement.quote || source?.quote || 'No quote available'}”</p>
                {domain ? <p className="mt-1 text-muted">— {domain}</p> : null}
              </TooltipContent>
            </Tooltip>
          </div>
        )
      })}
    </div>
  )
}
