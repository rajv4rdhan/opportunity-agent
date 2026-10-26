import { Children, cloneElement, isValidElement, type ReactNode } from 'react'
import { Copy, Download } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'

import { sopUrl } from '@/api/client'
import { Panel } from '@/components/common/Panel'
import { Button } from '@/components/ui/button'
import type { FinalReport } from '@/api/types'

const PLACEHOLDER = /\[ADD:[^\]]+\]/

function highlight(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === 'string') {
      return child.split(/(\[ADD:[^\]]+\])/g).map((part, index) =>
        PLACEHOLDER.test(part) ? (
          <mark
            key={`${part}-${index}`}
            className="rounded bg-warn-soft px-1 text-warn"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )
    }
    if (isValidElement<{ children?: ReactNode }>(child) && child.props.children) {
      return cloneElement(child, { children: highlight(child.props.children) })
    }
    return child
  })
}

export function SopDocument({
  runId,
  report,
  revisions,
}: {
  runId: string
  report: FinalReport
  revisions: number
}) {
  const sop = report.sop_markdown ?? ''
  if (!sop) {
    return (
      <Panel>
        <p className="py-10 text-center text-sm text-muted">No SOP was generated for this run.</p>
      </Panel>
    )
  }
  const words = sop.trim().split(/\s+/).filter(Boolean).length

  async function copy() {
    try {
      await navigator.clipboard.writeText(sop)
      toast.success('SOP copied')
    } catch {
      toast.error('Could not copy the SOP')
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Panel flush className="min-w-0 p-8 sm:p-10" testId="sop-panel">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
          <div className="min-w-0">
            <p className="text-xs leading-[18px] text-muted">Statement of purpose for</p>
            <h3
              className="truncate text-lg leading-6 font-semibold"
              title={report.sop_for || 'Your top match'}
            >
              {report.sop_for || 'Your top match'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted tabular-nums">
              {words} words · {revisions} {revisions === 1 ? 'revision' : 'revisions'}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={copy}
              aria-label="Copy SOP"
              className="text-muted"
            >
              <Copy className="size-3.5" strokeWidth={1.75} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                window.location.href = sopUrl(runId)
              }}
              aria-label="Download SOP"
              className="text-muted"
            >
              <Download className="size-3.5" strokeWidth={1.75} />
            </Button>
          </div>
        </div>
        <div className="sop max-w-[68ch]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p>{highlight(children)}</p>,
              li: ({ children }) => <li>{highlight(children)}</li>,
              h1: ({ children }) => <h1>{highlight(children)}</h1>,
              h2: ({ children }) => <h2>{highlight(children)}</h2>,
              h3: ({ children }) => <h3>{highlight(children)}</h3>,
            }}
          >
            {sop}
          </ReactMarkdown>
        </div>
      </Panel>

      <Panel title="Critic notes" className="self-start" testId="critic-panel">
        {report.critic_notes?.length ? (
          <ol className="list-decimal space-y-2 pl-4 text-xs leading-[18px] text-muted">
            {report.critic_notes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ol>
        ) : (
          <p className="py-4 text-sm text-ok">No open issues.</p>
        )}
      </Panel>
    </div>
  )
}
