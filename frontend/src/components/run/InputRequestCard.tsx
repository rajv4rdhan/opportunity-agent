import { useEffect, useMemo, useState } from 'react'
import { Hand, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { useResumeRun } from '@/api/queries'
import { ChipsInput } from '@/components/common/ChipsInput'
import { VoiceButton } from '@/components/intake/VoiceButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { COUNTRIES } from '@/lib/coverage'

interface Question {
  field?: string
  question?: string
  type?: string
  default?: unknown
}

function questionsOf(payload: Record<string, unknown> | null): Question[] {
  if (!payload) return []
  const questions = payload.questions
  return Array.isArray(questions) ? (questions as Question[]) : []
}

export function InputRequestCard({
  runId,
  payload,
}: {
  runId: string
  payload: Record<string, unknown> | null
}) {
  const questions = useMemo(() => questionsOf(payload), [payload])
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [submitted, setSubmitted] = useState(false)
  const resume = useResumeRun(runId)

  useEffect(() => {
    const initial: Record<string, unknown> = {}
    for (const question of questions) {
      const field = question.field ?? question.question ?? 'answer'
      if (question.default !== null && question.default !== undefined) {
        initial[field] = question.default
      } else if (question.type === 'multi') {
        initial[field] = []
      } else {
        initial[field] = ''
      }
    }
    setAnswers(initial)
    setSubmitted(false)
  }, [questions])

  if (!payload || questions.length === 0) return null

  function setValue(field: string, value: unknown) {
    setAnswers((current) => ({ ...current, [field]: value }))
  }

  async function send(values: Record<string, unknown>) {
    setSubmitted(true)
    try {
      await resume.mutateAsync(values)
    } catch (error) {
      setSubmitted(false)
      toast.error(error instanceof Error ? error.message : 'Could not resume the run')
    }
  }

  function submit() {
    const cleaned: Record<string, unknown> = {}
    for (const question of questions) {
      const field = question.field ?? question.question ?? 'answer'
      const value = answers[field]
      if (value === null || value === undefined || value === '') continue
      if (Array.isArray(value) && value.length === 0) continue
      cleaned[field] = question.type === 'number' ? Number(value) : value
    }
    void send(cleaned)
  }

  return (
    <section
      data-testid="input-request"
      className="rounded-[var(--radius-card)] border border-warn/40 bg-warn-soft/40 p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-warn-soft text-warn">
          <Hand className="size-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base leading-6 font-semibold">The swarm needs one detail</h2>
          <p className="text-xs leading-[18px] text-muted">
            Answer or skip — agents continue either way.
          </p>
        </div>
      </div>

      <div
        className={
          questions.length === 1 ? 'mt-4 grid grid-cols-1 gap-4' : 'mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2'
        }
      >
        {questions.map((question) => {
          const field = question.field ?? question.question ?? 'answer'
          const label = question.question ?? field
          if (question.type === 'multi') {
            return (
              <div key={field} className={questions.length === 1 ? '' : 'sm:col-span-2'}>
                <label className="mb-1.5 block text-sm font-medium">{label}</label>
                <ChipsInput
                  values={(answers[field] as string[] | undefined) ?? []}
                  onChange={(values) => setValue(field, values)}
                  placeholder="Type and press Enter"
                  suggestions={
                    field.toLowerCase().includes('countr') ? COUNTRIES : undefined
                  }
                  id={field}
                />
              </div>
            )
          }
          return (
            <div key={field}>
              <label className="mb-1.5 block text-sm font-medium" htmlFor={`answer-${field}`}>
                {label}
              </label>
              <div className="relative">
                <Input
                  id={`answer-${field}`}
                  type={question.type === 'number' ? 'number' : 'text'}
                  value={String(answers[field] ?? '')}
                  onChange={(event) => setValue(field, event.target.value)}
                  className={question.type !== 'number' ? 'pr-10' : undefined}
                />
                {question.type !== 'number' ? (
                  <div className="absolute top-0 right-0.5">
                    <VoiceButton
                      onFinal={(text) =>
                        setValue(
                          field,
                          `${String(answers[field] ?? '').trim()} ${text}`.trim(),
                        )
                      }
                    />
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="ghost"
          className="h-9"
          disabled={submitted}
          onClick={() => void send({})}
        >
          Skip
        </Button>
        <Button className="h-9" disabled={submitted} onClick={submit}>
          {submitted ? <Loader2 className="size-4 animate-spin" /> : null}
          Continue
        </Button>
      </div>
    </section>
  )
}
