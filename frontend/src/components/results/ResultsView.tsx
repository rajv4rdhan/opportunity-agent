import type { FinalReport } from '@/api/types'
import { EmptyState } from '@/components/common/EmptyState'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DeadlineList } from '@/components/results/DeadlineList'
import { MatchCard } from '@/components/results/MatchCard'
import { OpportunityTable } from '@/components/results/OpportunityTable'
import { ResultSummary } from '@/components/results/ResultSummary'
import { SopDocument } from '@/components/results/SopDocument'
import { UnlockMore } from '@/components/results/UnlockMore'

function Label({ children, short }: { children: string; short: string }) {
  return (
    <>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{children}</span>
    </>
  )
}

export function ResultsView({
  runId,
  report,
  revisions = 0,
}: {
  runId: string
  report: FinalReport
  revisions?: number
}) {
  const top5 = report.top5 ?? []

  return (
    <div id="results" className="flex flex-col gap-6">
      <ResultSummary report={report} />

      <Tabs defaultValue="matches" className="w-full">
        <TabsList className="grid h-9 w-full grid-cols-5 bg-subtle">
          <TabsTrigger value="matches" className="h-8 text-xs">
            Matches
          </TabsTrigger>
          <TabsTrigger value="all" className="h-8 text-xs">
            <Label short="All">All opportunities</Label>
          </TabsTrigger>
          <TabsTrigger value="unlock" className="h-8 text-xs">
            <Label short="Unlock">Unlock more</Label>
          </TabsTrigger>
          <TabsTrigger value="dates" className="h-8 text-xs">
            <Label short="Dates">Deadlines</Label>
          </TabsTrigger>
          <TabsTrigger value="sop" className="h-8 text-xs">
            SOP
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matches" forceMount className="mt-6 data-[state=inactive]:hidden">
          {top5.length ? (
            <div className="flex flex-col gap-4">
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
        </TabsContent>

        <TabsContent value="all" forceMount className="mt-6 data-[state=inactive]:hidden">
          <OpportunityTable report={report} />
        </TabsContent>

        <TabsContent value="unlock" forceMount className="mt-6 data-[state=inactive]:hidden">
          <UnlockMore runId={runId} report={report} />
        </TabsContent>

        <TabsContent value="dates" forceMount className="mt-6 data-[state=inactive]:hidden">
          <DeadlineList runId={runId} report={report} />
        </TabsContent>

        <TabsContent value="sop" forceMount className="mt-6 data-[state=inactive]:hidden">
          <SopDocument runId={runId} report={report} revisions={revisions} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
