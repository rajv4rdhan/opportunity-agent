import { useEffect, useMemo, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { ArrowLeft, Play, Search } from 'lucide-react'

import { useGraph, useMeta, useRun } from '@/api/queries'
import type { FinalReport } from '@/api/types'
import { EmptyState } from '@/components/common/EmptyState'
import { Panel } from '@/components/common/Panel'
import { Container } from '@/components/layout/Container'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
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

function PanelsLayout({
  state,
  isLg,
  isXl,
  graphData,
}: {
  state: RunState
  isLg: boolean
  isXl: boolean
  graphData: Record<string, unknown> | undefined
}) {
  const tabItems = isLg
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
      ]

  return (
    <>
      {isXl ? (
        <div data-row="panels" className="grid h-[440px] grid-cols-3 gap-6">
          <ProfilePanel state={state} />
          <ActivityPanel state={state} />
          <SourcesPanel state={state} />
        </div>
      ) : (
        <div className={cn('flex flex-col', isLg ? 'h-[480px]' : 'h-[520px]')}>
          <Tabs defaultValue="profile" className="flex h-full min-h-0 flex-col">
            <TabsList className={cn('grid h-9 w-full bg-subtle', isLg ? 'grid-cols-3' : 'grid-cols-5')}>
              {tabItems.map((item) => (
                <TabsTrigger key={item.value} value={item.value} className="h-8 text-xs">
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
                  <GraphPanel data={graphData} />
                </TabsContent>
                <TabsContent value="browser" className="min-h-0 flex-1">
                  <BrowserPanel url={state.liveViewUrl} finished={state.finished} />
                </TabsContent>
              </>
            ) : null}
          </Tabs>
        </div>
      )}

      {isLg ? (
        <div data-row="insight" className="grid h-[360px] grid-cols-2 gap-6 xl:h-[400px]">
          <GraphPanel data={graphData} />
          <BrowserPanel url={state.liveViewUrl} finished={state.finished} />
        </div>
      ) : null}
    </>
  )
}

function MissionLayout({
  state,
  isLg,
  isXl,
  graphData,
  afterPhase,
}: {
  state: RunState
  isLg: boolean
  isXl: boolean
  graphData: Record<string, unknown> | undefined
  afterPhase?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-6">
      <PhaseStepper state={state} compact={!isLg} />
      {afterPhase}
      <KpiStrip state={state} />
      <SwarmSection state={state} isLg={isLg} />
      <PanelsLayout state={state} isLg={isLg} isXl={isXl} graphData={graphData} />
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
  const isXl = useMediaQuery('(min-width: 1280px)')
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
    <MissionLayout state={state} isLg={isLg} isXl={isXl} graphData={graph.data} />
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

          {finished && report ? (
            <>
              <ResultsView runId={state.runId} report={report} revisions={revisions} />
              <Accordion type="single" collapsible className="ss-no-print">
                <AccordionItem value="mission">
                  <AccordionTrigger className="text-sm">How the swarm worked</AccordionTrigger>
                  <AccordionContent>{mission}</AccordionContent>
                </AccordionItem>
              </Accordion>
            </>
          ) : failed ? (
            <>
              <FailedPanel runId={state.runId} error={error} />
              <Accordion
                type="single"
                collapsible
                defaultValue="mission"
                className="ss-no-print"
              >
                <AccordionItem value="mission">
                  <AccordionTrigger className="text-sm">How the swarm worked</AccordionTrigger>
                  <AccordionContent>{mission}</AccordionContent>
                </AccordionItem>
              </Accordion>
            </>
          ) : (
            <MissionLayout
              state={state}
              isLg={isLg}
              isXl={isXl}
              graphData={graph.data}
              afterPhase={
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
