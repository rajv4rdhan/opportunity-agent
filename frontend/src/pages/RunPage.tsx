import { useEffect, useMemo, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { ArrowLeft, Play, Search } from 'lucide-react'

import { useGraph, useMeta, useRun } from '@/api/queries'
import type { FinalReport } from '@/api/types'
import { EmptyState } from '@/components/common/EmptyState'
import { Panel } from '@/components/common/Panel'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActivityPanel } from '@/components/run/ActivityPanel'
import { BrowserPanel } from '@/components/run/BrowserPanel'
import { GraphPanel } from '@/components/run/GraphPanel'
import { InputRequestCard } from '@/components/run/InputRequestCard'
import { ProfilePanel } from '@/components/run/ProfilePanel'
import { ReplayBar } from '@/components/run/ReplayBar'
import { RunBand } from '@/components/run/RunBand'
import { SourcesPanel } from '@/components/run/SourcesPanel'
import { SwarmSection } from '@/components/run/SwarmSection'
import { Telemetry } from '@/components/run/Telemetry'
import { ResultsView } from '@/components/results/ResultsView'
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

function SideTabs({
  state,
  graphData,
  graphLoading,
  className,
}: {
  state: RunState
  graphData: Record<string, unknown> | undefined
  graphLoading: boolean
  className?: string
}) {
  return (
    <Tabs defaultValue="profile" className={cn('flex min-h-0 flex-col gap-2', className)}>
      <TabsList className="grid h-10 w-full grid-cols-4 rounded-[10px] border border-line bg-surface p-1">
        {[
          { value: 'profile', label: 'Profile' },
          { value: 'sources', label: 'Sources' },
          { value: 'browser', label: 'Browser' },
          { value: 'graph', label: 'Graph' },
        ].map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            className="h-8 rounded-[7px] text-xs data-[state=active]:bg-accent data-[state=active]:text-on-accent data-[state=active]:shadow-none"
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="profile" className="min-h-0 flex-1">
        <ProfilePanel state={state} />
      </TabsContent>
      <TabsContent value="sources" className="min-h-0 flex-1">
        <SourcesPanel state={state} />
      </TabsContent>
      <TabsContent value="browser" className="min-h-0 flex-1">
        <BrowserPanel url={state.liveViewUrl} finished={state.finished} />
      </TabsContent>
      <TabsContent value="graph" className="min-h-0 flex-1">
        <GraphPanel data={graphData} loading={graphLoading} />
      </TabsContent>
    </Tabs>
  )
}

function MissionLayout({
  state,
  isLg,
  graphData,
  graphLoading,
  afterBand,
}: {
  state: RunState
  isLg: boolean
  graphData: Record<string, unknown> | undefined
  graphLoading: boolean
  afterBand?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-6">
      {afterBand}
      <SwarmSection state={state} isLg={isLg} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="h-[560px] min-h-0 min-w-0 lg:h-[640px]">
          <ActivityPanel state={state} />
        </div>
        <aside className="flex min-h-0 min-w-0 flex-col gap-4 lg:h-[640px]">
          <Telemetry state={state} />
          <SideTabs
            state={state}
            graphData={graphData}
            graphLoading={graphLoading}
            className="h-[520px] lg:h-auto lg:flex-1"
          />
        </aside>
      </div>
    </div>
  )
}

function FailedPanel({ runId, error }: { runId: string; error: string | null | undefined }) {
  const navigate = useNavigate()
  return (
    <Panel flush className="border-err/40 bg-err-soft/40 p-5" testId="failed-panel">
      <h2 className="text-base leading-6 font-semibold">This run stopped</h2>
      <p className="mt-1 font-mono text-xs leading-[18px] break-words text-muted">
        {error || 'The run was interrupted before it could finish.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="h-9 gap-1.5"
          onClick={() => navigate(`/runs/${runId}?replay=1&speed=20`)}
        >
          <Play className="size-4" strokeWidth={1.75} />
          Replay what happened
        </Button>
        <Button className="h-9 gap-1.5" onClick={() => navigate('/')}>
          <Search className="size-4" strokeWidth={1.75} />
          Start a new search
        </Button>
      </div>
    </Panel>
  )
}

function RunBody({
  state,
  report,
  error,
  runName,
  median,
  replayControls,
  replayDone,
}: {
  state: RunState
  report: FinalReport | null
  error: string | null | undefined
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
  const run = useRun(state.runId)
  const graph = useGraph(state.runId, state.graphVersion)
  const name = displayName(state, runName, report)
  useRunTitle(state, name)

  const revisions = useMemo(() => {
    const drafts = state.events.filter(
      (event) => event.type === 'agent_finished' && event.agent === 'sop_writer',
    ).length
    return Math.max(0, drafts - 1)
  }, [state.events])

  const finished = state.finished && state.status === 'finished' && Boolean(report)
  const failed = state.finished && state.status === 'failed' && !report
  const mission = (
    <MissionLayout
      state={state}
      isLg={isLg}
      graphData={graph.data}
      graphLoading={graph.isLoading}
    />
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
          <RunBand
            state={state}
            run={run.data}
            report={report}
            median={median}
            isReplay={Boolean(replayControls)}
          />

          {finished && report ? (
            <ResultsView runId={state.runId} report={report} revisions={revisions} swarm={mission} />
          ) : failed ? (
            <>
              <FailedPanel runId={state.runId} error={error} />
              {mission}
            </>
          ) : (
            <MissionLayout
              state={state}
              isLg={isLg}
              graphData={graph.data}
              graphLoading={graph.isLoading}
              afterBand={
                state.interrupt ? (
                  <InputRequestCard runId={state.runId} payload={state.interrupt} />
                ) : null
              }
            />
          )}
        </div>
      </Container>
    </>
  )
}

function LiveRun({ runId }: { runId: string }) {
  const { state } = useRunStream(runId)
  const run = useRun(runId)
  const meta = useMeta()
  return (
    <RunBody
      state={state}
      report={run.data?.report ?? null}
      error={run.data?.error}
      runName={run.data?.student_name}
      median={meta.data?.median_duration_sec}
    />
  )
}

function ReplayRun({ runId, speed }: { runId: string; speed: number }) {
  const replay = useReplay(runId, speed)
  const run = useRun(runId)
  const meta = useMeta()
  return (
    <RunBody
      state={replay.state}
      report={replay.done ? (run.data?.report ?? null) : null}
      error={run.data?.error}
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
  const rawSpeed = Number(search.get('speed') ?? 20)
  const speed = Number.isFinite(rawSpeed) && rawSpeed > 0 ? rawSpeed : 20

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
