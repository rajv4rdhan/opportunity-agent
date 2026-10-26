import { useState } from 'react'
import { Calculator, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { useWhatIf } from '@/api/queries'
import type { WhatIfResult } from '@/api/client'
import { Panel } from '@/components/common/Panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import type { FinalReport, Gap } from '@/api/types'

const RANK: Record<string, number> = {
  not_eligible: 0,
  unknown: 1,
  partial: 2,
  eligible: 3,
}

function GapCard({ gap }: { gap: Gap }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">{gap.requirement}</p>
        <Badge variant="secondary" className="shrink-0 text-[11px]">
          unlocks {gap.unlocks?.length ?? 0}
        </Badge>
      </div>
      <p className="mt-1 text-xs leading-[18px] text-muted">{gap.suggestion}</p>
      {gap.unlocks?.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {gap.unlocks.slice(0, 6).map((name) => (
            <span key={name} className="rounded-full bg-subtle px-2 py-0.5 text-[11px] text-muted">
              {name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs text-muted">{label}</label>
        <span className="font-mono text-xs tabular-nums">{value}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(values) => onChange(values[0] ?? min)}
        aria-label={label}
      />
    </div>
  )
}

export function UnlockMore({ runId, report }: { runId: string; report: FinalReport }) {
  const [gaps, setGaps] = useState<Gap[]>(report.gaps ?? [])
  const [result, setResult] = useState<WhatIfResult | null>(null)
  const mutation = useWhatIf(runId)

  const profile = report.profile
  const [cgpa, setCgpa] = useState(profile.cgpa ?? 0)
  const [ielts, setIelts] = useState(profile.test_scores?.ielts ?? 0)
  const [toefl, setToefl] = useState(profile.test_scores?.toefl ?? 0)
  const [gre, setGre] = useState(profile.test_scores?.gre ?? 260)
  const [work, setWork] = useState(profile.work_experience_years ?? 0)

  const original = new Map(
    (report.all_opportunities ?? []).map((item) => [item.id || item.name, item.eligibility]),
  )
  const newly = (result?.opportunities ?? []).filter((item) => {
    const before = original.get(String(item.id ?? item.name)) ?? 'unknown'
    return (RANK[String(item.eligibility ?? 'unknown')] ?? 1) > (RANK[before] ?? 1)
  })
  const blocked = (result?.opportunities ?? []).filter((item) => {
    const eligibility = String(item.eligibility ?? 'unknown')
    return eligibility === 'not_eligible' || eligibility === 'unknown'
  })

  async function recalculate() {
    try {
      const value = await mutation.mutateAsync({
        cgpa,
        'test_scores.ielts': ielts,
        'test_scores.toefl': toefl,
        'test_scores.gre': gre,
        work_experience_years: work,
      })
      setResult(value)
      setGaps(value.gaps as unknown as Gap[])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not recalculate')
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <h3 className="text-base leading-6 font-semibold">One step away</h3>
        <p className="mt-0.5 text-xs leading-[18px] text-muted">
          Each improvement can change several decisions.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {gaps.length ? (
            gaps.map((gap) => <GapCard key={gap.requirement} gap={gap} />)
          ) : (
            <Panel>
              <p className="py-6 text-center text-sm text-muted">
                No gaps — every requirement is met or unknown.
              </p>
            </Panel>
          )}
        </div>
      </div>

      <Panel flush className="p-5 lg:sticky lg:top-20 lg:self-start" testId="whatif-panel">
        <h3 className="text-base leading-6 font-semibold">What if…</h3>
        <p className="mt-0.5 text-xs leading-[18px] text-muted">
          Recalculate instantly with a stronger profile. No LLM calls.
        </p>
        <div className="mt-4 space-y-4">
          <SliderRow label="CGPA" value={cgpa} min={0} max={10} step={0.1} onChange={setCgpa} />
          <SliderRow label="IELTS" value={ielts} min={0} max={9} step={0.5} onChange={setIelts} />
          <SliderRow label="TOEFL" value={toefl} min={0} max={120} step={1} onChange={setToefl} />
          <SliderRow label="GRE" value={gre} min={260} max={340} step={1} onChange={setGre} />
          <SliderRow
            label="Work experience (years)"
            value={work}
            min={0}
            max={10}
            step={0.5}
            onChange={setWork}
          />
        </div>
        <Button className="mt-4 h-9 w-full" onClick={recalculate} disabled={mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Calculator className="size-4" strokeWidth={1.75} />
          )}
          Recalculate
        </Button>

        {result ? (
          <div className="mt-4 space-y-3 border-t border-line pt-3">
            <div>
              <p className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-muted uppercase">
                Newly eligible
              </p>
              {newly.length ? (
                <ul className="mt-1 space-y-1">
                  {newly.map((item) => (
                    <li key={String(item.id ?? item.name)} className="text-sm text-ok">
                      {String(item.name ?? item.id)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-muted">No new opportunities unlocked yet.</p>
              )}
            </div>
            {blocked.length ? (
              <div>
                <p className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-muted uppercase">
                  Still blocked
                </p>
                <ul className="mt-1 space-y-1">
                  {blocked.slice(0, 6).map((item) => (
                    <li key={String(item.id ?? item.name)} className="text-sm text-muted">
                      {String(item.name ?? item.id)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </Panel>
    </div>
  )
}
