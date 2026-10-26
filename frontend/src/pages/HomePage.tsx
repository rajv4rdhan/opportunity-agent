import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Lock, Quote, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

import { useCreateRun, useMeta } from '@/api/queries'
import { Composer, type ComposerValue } from '@/components/intake/Composer'
import { CoverageHints } from '@/components/intake/CoverageHints'
import { HowItWorks } from '@/components/intake/HowItWorks'
import {
  AdvancedSheet,
  EMPTY_ADVANCED,
  type AdvancedValues,
} from '@/components/intake/AdvancedSheet'
import { SampleRow } from '@/components/intake/SampleRow'
import { Container } from '@/components/layout/Container'
import { Skeleton } from '@/components/ui/skeleton'
import type { SampleInfo } from '@/api/types'
import type { IntakeAttachment } from '@/components/intake/AttachmentChip'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

function splitLinks(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function HomePage() {
  useDocumentTitle('ScholarSwarm')
  const navigate = useNavigate()
  const meta = useMeta()
  const createRun = useCreateRun()

  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<IntakeAttachment[]>([])
  const [sample, setSample] = useState<string | null>(null)
  const [advanced, setAdvanced] = useState<AdvancedValues>(EMPTY_ADVANCED)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  function pickSample(item: SampleInfo) {
    setDescription(item.description)
    setSample(item.name)
    toast.success(`Loaded sample: ${item.label}`)
  }

  async function submit(value: ComposerValue) {
    try {
      const runId = await createRun.mutateAsync({
        description: value.description || null,
        files: value.files.map((item) => ({ file: item.file, role: item.role })),
        sample: value.sample,
        input_modes: value.modes,
        github_url: advanced.github_url || null,
        linkedin_url: advanced.linkedin_url || null,
        other_links: splitLinks(advanced.other_links),
        target_countries: advanced.target_countries,
        target_degree: advanced.target_degree || null,
        target_fields: [],
        budget_inr_per_year: advanced.budget_inr_per_year,
        nationality: advanced.nationality || null,
        test_scores: {
          ielts: advanced.ielts,
          toefl: advanced.toefl,
          gre: advanced.gre,
        },
        notes: advanced.notes || null,
        chaos: advanced.chaos,
      })
      navigate(`/runs/${runId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start the run')
    }
  }

  return (
    <Container>
      <div className="flex flex-col items-center">
        <div className="w-full max-w-[720px]">
          <div className="mx-auto flex h-7 w-fit items-center gap-2 rounded-full border border-line bg-surface px-3 text-xs text-muted">
            <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
            11 AI agents · official sources only
          </div>

          <h1 className="mt-4 text-center text-[44px] leading-[52px] font-semibold tracking-[-0.02em] max-sm:text-[32px] max-sm:leading-[40px]">
            Find funding you actually qualify for.
          </h1>
          <p className="mx-auto mt-3 max-w-[560px] text-center text-base leading-[26px] text-muted">
            Upload a resume, type, or just talk. Agents research, verify every requirement and draft
            your application.
          </p>

          <div className="mt-8">
            <Composer
              description={description}
              onDescriptionChange={setDescription}
              files={files}
              onFilesChange={setFiles}
              sample={sample}
              onSampleClear={() => setSample(null)}
              busy={createRun.isPending}
              onSubmit={submit}
            />
          </div>

          <div className="mt-3">
            <CoverageHints text={description} hasFiles={files.length > 0} />
          </div>

          <div className="mt-4">
            {meta.isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Skeleton className="h-8 w-24 bg-subtle" />
                <Skeleton className="h-8 w-16 bg-subtle" />
                <Skeleton className="h-8 w-16 bg-subtle" />
                <Skeleton className="h-8 w-20 bg-subtle" />
              </div>
            ) : (
              <SampleRow
                samples={meta.data?.samples ?? []}
                onPick={pickSample}
                onAdvanced={() => setAdvancedOpen(true)}
              />
            )}
          </div>
        </div>

        <div className="mt-16 w-full">
          <HowItWorks />
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-ok" strokeWidth={1.75} />
            Official sources only
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Quote className="size-3.5" strokeWidth={1.75} />
            Every fact cited
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="size-3.5" strokeWidth={1.75} />
            Files stay in this session
          </span>
        </div>
      </div>

      <AdvancedSheet
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        values={advanced}
        onChange={setAdvanced}
        meta={meta.data}
      />
    </Container>
  )
}
