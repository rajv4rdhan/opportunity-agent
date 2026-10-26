import { FileText, FolderGit2 } from 'lucide-react'

import { Panel } from '@/components/common/Panel'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { RunState } from '@/state/runReducer'

const TEST_LABELS: Record<string, string> = {
  ielts: 'IELTS',
  toefl: 'TOEFL',
  pte: 'PTE',
  duolingo: 'Duolingo',
  gre: 'GRE',
  gmat: 'GMAT',
}

function text(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  const string = String(value).trim()
  return string || undefined
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : []
}

function objects(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    : []
}

function cgpa(snapshot: Record<string, unknown>): string | undefined {
  if (snapshot.cgpa === null || snapshot.cgpa === undefined) return undefined
  const scale = snapshot.cgpa_scale ?? 10
  return `${snapshot.cgpa}/${Number(scale)}`
}

export function ProfilePanel({ state }: { state: RunState }) {
  const snapshot = state.profileSnapshot

  if (!snapshot) {
    return (
      <Panel title="What the agents understood" subtitle="from resume + description">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="grid grid-cols-[96px_1fr] gap-4">
              <Skeleton className="h-4 w-16 bg-subtle" />
              <Skeleton className="h-4 w-full bg-subtle" />
            </div>
          ))}
        </div>
      </Panel>
    )
  }

  const target = [text(snapshot.target_degree), list(snapshot.target_fields).join(' / ')]
    .filter(Boolean)
    .join(' · ')
  const scores = (snapshot.test_scores as Record<string, unknown> | undefined) ?? {}
  const tests = Object.entries(scores)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${TEST_LABELS[key] ?? key.toUpperCase()} ${value}`)
    .join(' · ')
  const skills = list(snapshot.skills)
  const projects = objects(snapshot.projects)
  const resumeProjects = projects.filter((project) => project.source === 'resume')
  const githubProjects = projects.filter((project) => project.source === 'github')

  const missing: string[] = []
  if (!cgpa(snapshot)) missing.push('CGPA')
  if (!tests) missing.push('test scores')
  if (!list(snapshot.target_countries).length) missing.push('target countries')
  if (!text(snapshot.target_degree)) missing.push('target degree')

  const rows: Array<[string, string | undefined]> = [
    ['Degree', text(snapshot.current_degree) ?? text(snapshot.major)],
    ['University', text(snapshot.university)],
    ['CGPA', cgpa(snapshot)],
    ['Target', target || undefined],
    ['Countries', list(snapshot.target_countries).join(', ') || undefined],
    ['Tests', tests || undefined],
    [
      'Budget',
      snapshot.budget_inr_per_year
        ? `INR ${Number(snapshot.budget_inr_per_year).toLocaleString()}/yr`
        : undefined,
    ],
  ]

  return (
    <Panel title="What the agents understood" subtitle="from resume + description" scroll>
      <dl className="grid grid-cols-[96px_1fr] gap-x-4 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-xs leading-[18px] text-muted">{label}</dt>
            <dd className="min-w-0 truncate" title={value ?? undefined}>
              {value ?? '—'}
            </dd>
          </div>
        ))}
      </dl>

      {skills.length ? (
        <div className="mt-5">
          <p className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-muted uppercase">
            Skills
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {skills.slice(0, 10).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-[11px]">
                {skill}
              </Badge>
            ))}
            {skills.length > 10 ? (
              <Badge variant="outline" className="text-[11px]">
                +{skills.length - 10}
              </Badge>
            ) : null}
          </div>
        </div>
      ) : null}

      {projects.length ? (
        <div className="mt-5">
          <p className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-muted uppercase">
            Projects
          </p>
          {resumeProjects.length ? (
            <div className="mt-2">
              <p className="text-xs text-muted">From resume</p>
              {resumeProjects.map((project, index) => (
                <p key={`${project.name}-${index}`} className="flex items-center gap-1.5 text-sm">
                  <FileText className="size-3.5 text-muted" strokeWidth={1.75} />
                  <span className="truncate">{text(project.name) ?? 'Project'}</span>
                </p>
              ))}
            </div>
          ) : null}
          {githubProjects.length ? (
            <div className="mt-2">
              <p className="text-xs text-muted">Found on GitHub</p>
              {githubProjects.map((project, index) => (
                <p key={`${project.name}-${index}`} className="flex items-center gap-1.5 text-sm">
                  <FolderGit2 className="size-3.5 text-muted" strokeWidth={1.75} />
                  <span className="truncate">{text(project.name) ?? 'Repository'}</span>
                  <Badge variant="secondary" className="h-4 bg-ok-soft px-1 text-[10px] text-ok">
                    new
                  </Badge>
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : state.agentStatus.github_enricher === 'done' ? (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
          <FolderGit2 className="size-3.5" /> No GitHub projects found
        </p>
      ) : null}

      {missing.length ? (
        <div className="mt-5">
          <p className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-muted uppercase">
            Not provided
          </p>
          <p className="mt-1 text-xs text-muted">{missing.join(', ')}</p>
        </div>
      ) : null}
    </Panel>
  )
}
