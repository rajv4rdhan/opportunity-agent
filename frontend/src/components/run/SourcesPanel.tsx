import { ShieldCheck } from 'lucide-react'

import { Favicon } from '@/components/common/Favicon'
import { Panel } from '@/components/common/Panel'
import { StatusPill } from '@/components/common/StatusPill'
import { normalizeUrl } from '@/lib/url'
import type { RunState } from '@/state/runReducer'

export function SourcesPanel({ state }: { state: RunState }) {
  const workers = Object.values(state.workers)
  const verified = workers.filter((worker) => worker.state === 'verified').length
  const rejected = workers.filter((worker) => worker.state === 'rejected').length
  const total = state.candidates.length || workers.length

  return (
    <Panel
      title="Sources"
      subtitle={`${verified} verified · ${rejected} rejected · ${total} found`}
      scroll
      className="overflow-hidden"
    >
      {state.candidates.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">
          Candidates appear here as the Scout finds them.
        </p>
      ) : (
        state.candidates.slice(-120).map((candidate, index) => {
          const worker = state.workers[normalizeUrl(candidate.url)]
          const domain =
            worker?.domain ||
            candidate.url.replace(/^https?:\/\//, '').split('/')[0] ||
            candidate.url
          return (
            <div
              key={`${candidate.url}-${index}`}
              className="flex items-center gap-3 border-b border-line/60 py-2"
            >
              <Favicon domain={domain} />
              <div className="min-w-0 flex-1">
                <a
                  href={candidate.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-[13px] hover:text-accent"
                  title={candidate.title}
                >
                  {candidate.title}
                </a>
                <p className="truncate text-xs leading-[18px] text-muted">{domain}</p>
              </div>
              {worker ? <StatusPill status={worker.state} /> : null}
              {candidate.official ? (
                <ShieldCheck className="size-3.5 shrink-0 text-ok" strokeWidth={1.75} />
              ) : null}
            </div>
          )
        })
      )}
    </Panel>
  )
}
