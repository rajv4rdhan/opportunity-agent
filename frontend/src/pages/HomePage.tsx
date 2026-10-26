import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { useCreateRun, useMeta } from '@/api/queries'
import { Composer, type ComposerValue } from '@/components/intake/Composer'
import { DossierSpecimen } from '@/components/intake/DossierSpecimen'
import { FiguresRow, HowItWorks } from '@/components/intake/HowItWorks'
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

/** Hand-drawn underline that inks itself in under one word. */
function Underlined({ children }: { children: string }) {
  return (
    <span className="relative inline-block text-accent">
      {children}
      <svg
        viewBox="0 0 200 12"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute -bottom-1.5 left-0 h-3 w-full"
      >
        <path
          d="M2 8 C 40 3, 90 3, 120 6 S 180 10, 198 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="220"
          style={{ ['--len' as string]: 220, animation: 'ss-draw 0.9s cubic-bezier(.2,.8,.2,1) 0.35s both' }}
        />
      </svg>
    </span>
  )
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
      <section className="grid items-start gap-12 pt-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:gap-14 xl:pt-6">
        <div className="min-w-0">
          <p className="ss-rise inline-flex h-7 items-center gap-2 rounded-[6px] border border-accent/25 bg-accent-soft px-2.5 font-mono text-[11px] tracking-[0.1em] text-accent uppercase">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            Scholarship research · 11 agents
          </p>

          <h1
            className="ss-rise mt-5 text-[56px] leading-[60px] font-semibold tracking-[-0.035em] max-md:text-[44px] max-md:leading-[48px] max-sm:text-[34px] max-sm:leading-[40px]"
            style={{ ['--i' as string]: 1 }}
          >
            Find the funding you <Underlined>actually</Underlined> qualify for.
          </h1>
          <p
            className="ss-rise mt-5 max-w-[540px] text-[17px] leading-7 text-muted max-sm:text-base"
            style={{ ['--i' as string]: 2 }}
          >
            Upload a resume, write a few lines, or just talk. Agents search official pages, check every
            rule against your profile and draft your application.
          </p>

          <div className="ss-rise mt-8" style={{ ['--i' as string]: 3 }}>
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

          <div className="mt-4">
            {meta.isLoading ? (
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-24 bg-subtle" />
                <Skeleton className="h-8 w-16 bg-subtle" />
                <Skeleton className="h-8 w-16 bg-subtle" />
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

        <div className="hidden lg:sticky lg:top-24 lg:block">
          <DossierSpecimen />
        </div>
      </section>

      <div className="mt-20">
        <HowItWorks />
      </div>

      <div className="mt-20">
        <FiguresRow />
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
