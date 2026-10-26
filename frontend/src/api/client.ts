import type { Event, FinalReport, MetaResponse, RunDetail, RunSummary } from './types'
import { apiUrl } from './url'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), init)
  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = (await response.json()) as { detail?: unknown }
      if (typeof body.detail === 'string') detail = body.detail
      else if (body.detail) detail = JSON.stringify(body.detail)
    } catch {
      // Keep the status text.
    }
    throw new ApiError(response.status, detail)
  }
  return (await response.json()) as T
}

export function getMeta(): Promise<MetaResponse> {
  return requestJson<MetaResponse>('/api/meta')
}

export function listRuns(): Promise<RunSummary[]> {
  return requestJson<RunSummary[]>('/api/runs?limit=100')
}

export function getRun(id: string): Promise<RunDetail> {
  return requestJson<RunDetail>(`/api/runs/${encodeURIComponent(id)}`)
}

export function getEventsJson(id: string): Promise<Event[]> {
  return requestJson<Event[]>(`/api/runs/${encodeURIComponent(id)}/events.json`)
}

export interface UploadFile {
  file: File
  role: 'resume' | 'transcript'
}

export interface CreateRunInput {
  description?: string | null
  files?: UploadFile[]
  sample?: string | null
  input_modes?: string[]
  github_url?: string | null
  linkedin_url?: string | null
  other_links?: string[]
  target_countries?: string[]
  target_degree?: string | null
  target_fields?: string[]
  budget_inr_per_year?: number | null
  nationality?: string | null
  test_scores?: Record<string, number | null | undefined>
  notes?: string | null
  chaos?: Record<string, boolean>
}

function append(form: FormData, key: string, value: string | number | null | undefined): void {
  if (value === null || value === undefined || value === '') return
  form.append(key, String(value))
}

export async function createRun(input: CreateRunInput): Promise<string> {
  const form = new FormData()
  for (const upload of input.files ?? []) {
    form.append(upload.role, upload.file, upload.file.name)
  }
  append(form, 'sample', input.sample)
  append(form, 'description', input.description)
  append(form, 'input_modes', (input.input_modes ?? []).join(','))
  append(form, 'github_url', input.github_url)
  append(form, 'linkedin_url', input.linkedin_url)
  append(form, 'other_links', (input.other_links ?? []).join(','))
  append(form, 'target_countries', (input.target_countries ?? []).join(','))
  append(form, 'target_degree', input.target_degree)
  append(form, 'target_fields', (input.target_fields ?? []).join(','))
  append(form, 'budget_inr_per_year', input.budget_inr_per_year)
  append(form, 'nationality', input.nationality)
  append(form, 'notes', input.notes)
  if (input.test_scores && Object.values(input.test_scores).some((value) => value != null)) {
    form.append('test_scores_json', JSON.stringify(input.test_scores))
  }
  if (input.chaos && Object.values(input.chaos).some(Boolean)) {
    form.append('chaos_json', JSON.stringify(input.chaos))
  }
  const result = await requestJson<{ run_id: string }>('/api/runs', {
    method: 'POST',
    body: form,
  })
  return result.run_id
}

export async function resumeRun(
  id: string,
  answers: Record<string, unknown>,
): Promise<void> {
  await requestJson<{ ok: boolean }>(`/api/runs/${encodeURIComponent(id)}/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  })
}

export function getGraph(id: string): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>>(`/api/runs/${encodeURIComponent(id)}/graph`)
}

export interface WhatIfResult {
  opportunities: Array<Record<string, unknown> & { id?: string; name?: string; eligibility?: string }>
  gaps: Array<Record<string, unknown>>
}

export function whatIf(id: string, overrides: Record<string, unknown>): Promise<WhatIfResult> {
  return requestJson<WhatIfResult>(`/api/runs/${encodeURIComponent(id)}/whatif`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overrides }),
  })
}

export function eventsUrl(id: string, after = 0): string {
  return apiUrl(`/api/runs/${encodeURIComponent(id)}/events?after=${after}`)
}

export function reportUrl(id: string): string {
  return apiUrl(`/api/runs/${encodeURIComponent(id)}/report.md`)
}

export function sopUrl(id: string): string {
  return apiUrl(`/api/runs/${encodeURIComponent(id)}/sop.md`)
}

export function icsUrl(id: string): string {
  return apiUrl(`/api/runs/${encodeURIComponent(id)}/deadlines.ics`)
}

export type { Event, FinalReport }
