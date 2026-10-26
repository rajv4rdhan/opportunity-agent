import { Panel } from '@/components/common/Panel'

export function BrowserPanel({ url, finished }: { url: string | null; finished: boolean }) {
  return (
    <Panel
      title="Live browser"
      actions={
        url ? (
          <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-err/30 bg-err-soft px-2 text-xs font-medium text-err">
            <span className="size-1.5 animate-pulse rounded-full bg-current" />
            LIVE
          </span>
        ) : null
      }
      flush
      className="overflow-hidden"
    >
      {url ? (
        <iframe
          src={url}
          title="Agent browser"
          className="h-full w-full rounded-b-[12px] border-0"
          sandbox="allow-scripts allow-same-origin"
        />
      ) : (
        <p className="flex h-full items-center justify-center px-6 text-center text-sm text-muted">
          {finished
            ? 'Browser session closed'
            : "An agent's browser appears here when it opens a website"}
        </p>
      )}
    </Panel>
  )
}
