import {
  FileCheck2,
  FileText,
  GitBranch,
  FolderGit2,
  Map,
  MessageCircleQuestion,
  Network,
  PenLine,
  ScanSearch,
  Search,
  ShieldCheck,
  Trophy,
  type LucideIcon,
} from 'lucide-react'

export type PhaseId = 'understand' | 'plan' | 'research' | 'verify' | 'decide' | 'write'
export type AgentStatus = 'idle' | 'running' | 'done' | 'failed' | 'skipped' | 'waiting'

export interface AgentMeta {
  id: string
  short: string
  label: string
  role: string
  phase: PhaseId
  icon: LucideIcon
}

export interface PhaseMeta {
  id: PhaseId
  label: string
  agents: string[]
}

export interface AgentLayout {
  x: number
  y: number
  width: number
  height: number
}

export interface EdgeSpec {
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
  type: 'flow' | 'loop'
  label?: string
}

export const PHASES: PhaseMeta[] = [
  {
    id: 'understand',
    label: 'Understand',
    agents: ['profile_analyst', 'clarifier', 'github_enricher'],
  },
  { id: 'plan', label: 'Plan', agents: ['planner', 'supervisor'] },
  { id: 'research', label: 'Research', agents: ['scout'] },
  { id: 'verify', label: 'Verify', agents: ['verifier'] },
  { id: 'decide', label: 'Decide', agents: ['matcher', 'ranker'] },
  { id: 'write', label: 'Write', agents: ['sop_writer', 'critic', 'finalizer'] },
]

export const AGENTS: AgentMeta[] = [
  {
    id: 'profile_analyst',
    short: 'Profile',
    label: 'Profile Analyst',
    role: 'Reads your resume, transcript and words',
    phase: 'understand',
    icon: FileText,
  },
  {
    id: 'clarifier',
    short: 'Clarifier',
    label: 'Clarifier',
    role: 'Asks when one detail is missing',
    phase: 'understand',
    icon: MessageCircleQuestion,
  },
  {
    id: 'github_enricher',
    short: 'GitHub',
    label: 'GitHub Enricher',
    role: 'Finds projects your resume missed',
    phase: 'understand',
    icon: FolderGit2,
  },
  {
    id: 'planner',
    short: 'Planner',
    label: 'Planner',
    role: 'Chooses what to search for',
    phase: 'plan',
    icon: Map,
  },
  {
    id: 'supervisor',
    short: 'Supervisor',
    label: 'Supervisor',
    role: 'Checks progress and re-plans',
    phase: 'plan',
    icon: GitBranch,
  },
  {
    id: 'scout',
    short: 'Scout',
    label: 'Scout',
    role: 'Searches the web for programs',
    phase: 'research',
    icon: Search,
  },
  {
    id: 'verifier',
    short: 'Verifiers',
    label: 'Verifiers',
    role: 'Reads official pages and checks rules',
    phase: 'verify',
    icon: ShieldCheck,
  },
  {
    id: 'matcher',
    short: 'Matcher',
    label: 'Matcher',
    role: 'Scores fit and writes the graph',
    phase: 'decide',
    icon: Network,
  },
  {
    id: 'ranker',
    short: 'Ranker',
    label: 'Ranker',
    role: 'Picks your top five matches',
    phase: 'decide',
    icon: Trophy,
  },
  {
    id: 'sop_writer',
    short: 'SOP',
    label: 'SOP Writer',
    role: 'Drafts your statement of purpose',
    phase: 'write',
    icon: PenLine,
  },
  {
    id: 'critic',
    short: 'Critic',
    label: 'Critic',
    role: 'Fact-checks the SOP',
    phase: 'write',
    icon: ScanSearch,
  },
  {
    id: 'finalizer',
    short: 'Report',
    label: 'Finalizer',
    role: 'Packages the final report',
    phase: 'write',
    icon: FileCheck2,
  },
]

export const AGENT_BY_ID: Record<string, AgentMeta> = Object.fromEntries(
  AGENTS.map((agent) => [agent.id, agent]),
)

export const PHASE_OF_AGENT: Record<string, PhaseId> = Object.fromEntries(
  AGENTS.map((agent) => [agent.id, agent.phase]),
)

export const PHASE_INDEX: Record<PhaseId, number> = Object.fromEntries(
  PHASES.map((phase, index) => [phase.id, index]),
) as Record<PhaseId, number>

export const PHASE_BY_ID: Record<string, PhaseMeta> = Object.fromEntries(
  PHASES.map((phase) => [phase.id, phase]),
)

export const AGENT_WIDTH = 210
export const AGENT_HEIGHT = 76
export const VERIFIER_WIDTH = 230
export const VERIFIER_HEIGHT = 300

export const LAYOUT: Record<string, AgentLayout> = {
  profile_analyst: { x: 0, y: 0, width: AGENT_WIDTH, height: AGENT_HEIGHT },
  clarifier: { x: 0, y: 112, width: AGENT_WIDTH, height: AGENT_HEIGHT },
  github_enricher: { x: 0, y: 224, width: AGENT_WIDTH, height: AGENT_HEIGHT },
  scout: { x: 250, y: 0, width: AGENT_WIDTH, height: AGENT_HEIGHT },
  planner: { x: 250, y: 112, width: AGENT_WIDTH, height: AGENT_HEIGHT },
  verifier: { x: 500, y: 0, width: VERIFIER_WIDTH, height: VERIFIER_HEIGHT },
  matcher: { x: 770, y: 0, width: AGENT_WIDTH, height: AGENT_HEIGHT },
  supervisor: { x: 770, y: 112, width: AGENT_WIDTH, height: AGENT_HEIGHT },
  ranker: { x: 770, y: 224, width: AGENT_WIDTH, height: AGENT_HEIGHT },
  finalizer: { x: 1020, y: 0, width: AGENT_WIDTH, height: AGENT_HEIGHT },
  critic: { x: 1020, y: 112, width: AGENT_WIDTH, height: AGENT_HEIGHT },
  sop_writer: { x: 1020, y: 224, width: AGENT_WIDTH, height: AGENT_HEIGHT },
}

export const LANES = [
  { id: 'lane-understand', label: 'UNDERSTAND', x: 0, y: -36, width: AGENT_WIDTH },
  { id: 'lane-plan', label: 'PLAN & RESEARCH', x: 250, y: -36, width: AGENT_WIDTH },
  { id: 'lane-verify', label: 'VERIFY', x: 500, y: -36, width: VERIFIER_WIDTH },
  { id: 'lane-decide', label: 'DECIDE', x: 770, y: -36, width: AGENT_WIDTH },
  { id: 'lane-write', label: 'WRITE', x: 1020, y: -36, width: AGENT_WIDTH },
]

export const EDGES: EdgeSpec[] = [
  {
    source: 'profile_analyst',
    target: 'clarifier',
    sourceHandle: 'b-s',
    targetHandle: 't-t',
    type: 'flow',
  },
  {
    source: 'clarifier',
    target: 'github_enricher',
    sourceHandle: 'b-s',
    targetHandle: 't-t',
    type: 'flow',
  },
  {
    source: 'profile_analyst',
    target: 'github_enricher',
    sourceHandle: 'l-s',
    targetHandle: 'l-t',
    type: 'loop',
  },
  {
    source: 'github_enricher',
    target: 'planner',
    sourceHandle: 'r-s',
    targetHandle: 'l-t',
    type: 'flow',
  },
  {
    source: 'planner',
    target: 'scout',
    sourceHandle: 't-s',
    targetHandle: 'b-t',
    type: 'flow',
  },
  {
    source: 'scout',
    target: 'verifier',
    sourceHandle: 'r-s',
    targetHandle: 'l-t',
    type: 'flow',
  },
  {
    source: 'verifier',
    target: 'matcher',
    sourceHandle: 'r-s',
    targetHandle: 'l-t',
    type: 'flow',
  },
  {
    source: 'matcher',
    target: 'supervisor',
    sourceHandle: 'b-s',
    targetHandle: 't-t',
    type: 'flow',
  },
  {
    source: 'supervisor',
    target: 'planner',
    sourceHandle: 'l-s',
    targetHandle: 'r-t',
    type: 'loop',
    label: 're-plan',
  },
  {
    source: 'supervisor',
    target: 'ranker',
    sourceHandle: 'b-s',
    targetHandle: 't-t',
    type: 'flow',
  },
  {
    source: 'ranker',
    target: 'sop_writer',
    sourceHandle: 'r-s',
    targetHandle: 'l-t',
    type: 'flow',
  },
  {
    source: 'sop_writer',
    target: 'critic',
    sourceHandle: 't-s',
    targetHandle: 'b-t',
    type: 'flow',
  },
  {
    source: 'critic',
    target: 'sop_writer',
    sourceHandle: 'r-s',
    targetHandle: 'r-t',
    type: 'loop',
    label: 'revise',
  },
  {
    source: 'critic',
    target: 'finalizer',
    sourceHandle: 't-s',
    targetHandle: 'b-t',
    type: 'flow',
  },
]

export const HANDOFF_LABELS: Record<string, string> = {
  plan: '{n} search queries',
  candidates: '{n} candidates',
  pending_verify: '{n} candidates',
  opportunities: '{n} opportunities',
  rejected: '{n} rejected',
  gaps: '{n} gaps',
  top5: 'top {n}',
  critic_notes: '{n} notes',
}

export const IMPORTANT_EVENTS = new Set([
  'decision',
  'fallback',
  'retry',
  'chaos_injected',
  'interrupt',
  'resumed',
  'opportunity_verified',
  'agent_failed',
  'tool_error',
  'run_started',
  'run_finished',
  'run_failed',
  'agent_skipped',
])

export const EVENT_TONE: Record<string, 'warn' | 'err' | 'accent' | 'ok' | 'muted'> = {
  fallback: 'warn',
  retry: 'warn',
  chaos_injected: 'warn',
  tool_error: 'err',
  agent_failed: 'err',
  run_failed: 'err',
  decision: 'accent',
  interrupt: 'warn',
  resumed: 'accent',
  opportunity_verified: 'ok',
  opportunity_rejected: 'muted',
  tool_call: 'accent',
  tool_result: 'accent',
  candidate_found: 'accent',
  graph_update: 'ok',
  browser_live_view: 'accent',
  agent_started: 'accent',
  agent_finished: 'ok',
  agent_skipped: 'muted',
  run_started: 'accent',
  run_finished: 'ok',
  log: 'muted',
}

export function edgeId(source: string, target: string): string {
  return `${source}->${target}`
}
