import { useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { ArrowLeft, RefreshCw } from 'lucide-react'

import { useGraph, useMeta, useRun } from '@/api/queries'
import type { FinalReport } from '@/api/types'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActivityPanel } from '@/components/run/ActivityPanel'
import { BrowserPanel } from '@/components/run/BrowserPanel'
import { GraphPanel } from '@/components/run/GraphPanel'
import { InputRequestCard } from '@/components/run/InputRequestCard'
import { KpiStrip } from '@/components/run/KpiStrip'
import { PhaseStepper } from '@/components/run/PhaseStepper'
import { ProfilePanel } from '@/components/run/ProfilePanel'
import { ReplayBar } from '@/components/run/ReplayBar'
import { RunHeader } from '@/components/run/RunHeader'
import { SourcesPanel } from '@/components/run/SourcesPanel'
import { SwarmSection } from '@/components/run/SwarmSection'
import { cn } from '@/lib/cn'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { useReplay } from '@/state/useReplay'
import { useRunStream } from '@/state/useRunStream'
import { PHASE_INDEX, PHASES } from '@/swarm/agents'
import type { RunState } from '@/state/runReducer'

function displayName(state: RunState, runName: string | null | undefined, report: FinalReport | null) {
  return report?.profile?.name || state.studentName || runName || 'Student'
}

function useRunTitle(state: RunState, name: string) {
  useEffect(() => {
    if (state.finished && state.status === 'failed') {
      document.title = `Run stopped · ${name} · ScholarSwarm`
      return
    }
    if (state.finished) {
      document.title = `✓ Results · ${name} · ScholarSwarm`
      return
    }
    if (state.phase) {
      const index = PHASE_INDEX[state.phase as keyof typeof PHASE_INDEX] + 1
      document.title = `(${index}/6) ${PHASES[index - 1]?.label ?? state.phase} · ${name} · ScholarSwarm`
      return
    }
    document.title = `Live run · ${name} · ScholarSwarm`
  }, [state.finished, state.status, state.phase, name])
}

function RunBody({
  state,
  report,
  runName,
  median,
  replayControls,
  replayDone,
}: {
  state: RunState
  report: FinalReport | null
  runName: string | null | undefined
  median: number | null | undefined
  replayControls?: {
    speed: number
    setSpeed: (speed: number) => void
    restart: () => void
  }
  replayDone?: boolean
}) {
  const isLg = useMediaQuery('(min-width: 1024px)')
  const isXl = useMediaQuery('(min-width: 1280px)')
  const run = useRun(state.runId)
  const graph = useGraph(state.runId, state.graphVersion)
  const name = displayName(state, runName, report)
  useRunTitle(state, name)

  const finished = state.finished
  const showInsight = isLg

  const tabItems = useMemo(
    () =>
      isLg
        ? [
            { value: 'profile', label: 'Profile' },
            { value: 'activity', label: 'Activity' },
            { value: 'sources', label: 'Sources' },
          ]
        : [
            { value: 'profile', label: 'Profile' },
            { value: 'activity', label: 'Activity' },
            { value: 'sources', label: 'Sources' },
            { value: 'graph', label: 'Graph' },
            { value: 'browser', label: 'Browser' },
          ],
    [isLg],
  )

  return (
    <>
      {replayControls ? (
        <ReplayBar
          runId={state.runId}
          speed={replayControls.speed}
          onSpeed={replayControls.setSpeed}
          onRestart={replayControls.restart}
          done={Boolean(replayDone)}
        />
      ) : null}
      <Container>
        <div className="flex flex-col gap-6">
          <RunHeader
            state={state}
            run={run.data}
            report={report}
            median={median}
            isReplay={Boolean(replayControls)}
          />
          <PhaseStepper state={state} compact={!isLg} />
          {state.interrupt ? (
            <InputRequestCard runId={state.runId} payload={state.interrupt} />
          ) : null}
          <KpiStrip state={state} />
          <SwarmSection state={state} isLg={isLg} />

          {isXl ? (
            <div data-row="panels" className="grid h-[440px] grid-cols-3 gap-6">
              <ProfilePanel state={state} />
              <ActivityPanel state={state} />
              <SourcesPanel state={state} />
            </div>
          ) : (
            <div className={cn('flex flex-col', isLg ? 'h-[480px]' : 'h-[520px]')}>
              <Tabs defaultValue="profile" className="flex h-full min-h-0 flex-col">
                <TabsList
                  className={cn('grid w-full', isLg ? 'grid-cols-3' : 'grid-cols-5')}
                >
                  {tabItems.map((item) => (
                    <TabsTrigger key={item.value} value={item.value} className="text-xs">
                      {item.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="profile" className="min-h-0 flex-1">
                  <ProfilePanel state={state} />
                </TabsContent>
                <TabsContent value="activity" className="min-h-0 flex-1">
                  <ActivityPanel state={state} title={false} />
                </TabsContent>
                <TabsContent value="sources" className="min-h-0 flex-1">
                  <SourcesPanel state={state} />
                </TabsContent>
                {!isLg ? (
                  <>
                    <TabsContent value="graph" className="min-h-0 flex-1">
                      <GraphPanel data={graph.data} />
                    </TabsContent>
                    <TabsContent value="browser" className="min-h-0 flex-1">
                      <BrowserPanel url={state.liveViewUrl} finished={finished} />
                    </TabsContent>
                  </>
                ) : null}
              </Tabs>
            </div>
          )}

          {showInsight ? (
            <div
              data-row="insight"
              className="grid h-[360px] grid-cols-2 gap-6 xl:h-[400px]"
            >
              <GraphPanel data={graph.data} />
              <BrowserPanel url={state.liveViewUrl} finished={finished} />
            </div>
          ) : null}

          <div id="results">
            {finished && report ? (
              <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-card">
                <PageHeader
                  title="Results"
                  subtitle={`${report.all_opportunities?.length ?? 0} opportunities verified for ${name}.`}
                />
                <Button onClick={() => window.location.reload()} variant="outline" className="h-9">
                  <RefreshCw className="size-4" /> Reload results
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </Container>
    </>
  )
}

function LiveRun({ runId }: { runId: string }) {
  const { state } = useRunStream(runId)
  const run = useRun(runId)
  const meta = useMeta()
  const report = run.data?.report ?? null
  return (
    <RunBody
      state={state}
      report={report}
      runName={run.data?.student_name}
      median={meta.data?.median_duration_sec}
    />
  )
}

function ReplayRun({ runId, speed }: { runId: string; speed: number }) {
  const replay = useReplay(runId, speed)
  const run = useRun(runId)
  const meta = useMeta()
  const report = replay.done ? (run.data?.report ?? null) : null
  return (
    <RunBody
      state={replay.state}
      report={report}
      runName={run.data?.student_name}
      median={meta.data?.median_duration_sec}
      replayControls={{
        speed: replay.speed,
        setSpeed: replay.setSpeed,
        restart: replay.restart,
      }}
      replayDone={replay.done}
    />
  )
}

export function RunPage() {
  const { id } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const run = useRun(id)
  const isReplay = search.get('replay') === '1'
  const speed = Number(search.get('speed') ?? 20)

  if (!id) {
    return (
      <Container>
        <EmptyState title="Run not found" description="This run does not exist." />
      </Container>
    )
  }

  if (run.isError) {
    return (
      <Container>
        <EmptyState
          title="Run not found"
          description="This run does not exist or was deleted."
          action={
            <Button className="h-9" onClick={() => navigate('/runs')}>
              <ArrowLeft className="size-4" /> Back to history
            </Button>
          }
        />
      </Container>
    )
  }

  return isReplay ? <ReplayRun runId={id} speed={speed} /> : <LiveRun runId={id} />
}
