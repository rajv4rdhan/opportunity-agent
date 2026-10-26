import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createRun,
  getGraph,
  getMeta,
  getRun,
  listRuns,
  resumeRun,
  whatIf,
  type CreateRunInput,
} from './client'

export function useMeta() {
  return useQuery({
    queryKey: ['meta'],
    queryFn: getMeta,
    staleTime: 60_000,
  })
}

export function useRuns() {
  return useQuery({
    queryKey: ['runs'],
    queryFn: listRuns,
    staleTime: 5_000,
  })
}

export function useRun(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['run', id],
    queryFn: () => getRun(id as string),
    enabled: Boolean(id) && enabled,
    staleTime: 0,
  })
}

export function useGraph(id: string, version: number) {
  return useQuery({
    queryKey: ['graph', id, version],
    queryFn: () => getGraph(id),
    enabled: Boolean(id) && version > 0,
    staleTime: 10_000,
  })
}

export function useCreateRun() {
  return useMutation({
    mutationFn: (input: CreateRunInput) => createRun(input),
  })
}

export function useResumeRun(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (answers: Record<string, unknown>) => resumeRun(id, answers),
    onSuccess: () => client.invalidateQueries({ queryKey: ['run', id] }),
  })
}

export function useWhatIf(id: string) {
  return useMutation({
    mutationFn: (overrides: Record<string, unknown>) => whatIf(id, overrides),
  })
}
