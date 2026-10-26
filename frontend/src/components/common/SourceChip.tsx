import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react'

import { Favicon } from '@/components/common/Favicon'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { domainOf } from '@/lib/url'
import type { Source } from '@/api/types'

const ICONS = {
  verified_official: ShieldCheck,
  third_party: ShieldAlert,
  unverified: ShieldQuestion,
}

export function SourceChip({
  source,
  verification = 'unverified',
}: {
  source: Source
  verification?: string
}) {
  const domain = domainOf(source.url)
  const Icon = ICONS[verification as keyof typeof ICONS] ?? ShieldQuestion
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-7 max-w-[220px] items-center gap-1.5 rounded-full border border-line bg-subtle px-2.5 text-xs text-ink hover:border-line-strong"
        >
          <Favicon domain={domain} />
          <span className="truncate">{domain}</span>
          <Icon
            className={
              verification === 'verified_official'
                ? 'size-3.5 text-ok'
                : verification === 'third_party'
                  ? 'size-3.5 text-warn'
                  : 'size-3.5 text-muted'
            }
            strokeWidth={1.75}
          />
        </a>
      </TooltipTrigger>
      <TooltipContent className="max-w-[320px]">
        <p className="text-xs">{source.quote || source.url}</p>
      </TooltipContent>
    </Tooltip>
  )
}
