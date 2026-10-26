import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { SlidersHorizontal, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { useCreateRun, useMeta } from '@/api/queries'
import { Composer, type ComposerValue } from '@/components/intake/Composer'
import { CoverageHints } from '@/components/intake/CoverageHints'
import {
  AdvancedSheet,
  EMPTY_ADVANCED,
  type AdvancedValues,
} from '@/components/intake/AdvancedSheet'
import {
  AgentMarquee,
  DossierBand,
  FaqSection,
  FeatureCards,
  ProductPreview,
  ProfileCards,
  SectionHead,
  StatRow,
} from '@/components/home/HomeSections'
import { Container } from '@/components/layout/Container'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SampleInfo } from '@/api/types'
import type { IntakeAttachment } from '@/components/intake/AttachmentChip'
import { speechSupported } from '@/lib/speech'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

const LANGUAGES = [
  { value: 'en-IN', label: 'English (India)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'hi-IN', label: 'Hindi' },
]

function splitLinks(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function HomePage() {
  useDocumentTitle('ScholarSwarm')
  const navigate = useNavigate()
  const location = useLocation()
  const meta = useMeta()
  const createRun = useCreateRun()

  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<IntakeAttachment[]>([])
  const [sample, setSample] = useState<string | null>(null)
  const [advanced, setAdvanced] = useState<AdvancedValues>(EMPTY_ADVANCED)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [lang, setLang] = useState('en-IN')
  const samples = meta.data?.samples ?? []

  // Header links point at /#section; scroll there once the page is on screen.
  useEffect(() => {
    if (!location.hash) return
    const timer = setTimeout(() => {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
    return () => clearTimeout(timer)
  }, [location.hash])

  function pickSample(item: SampleInfo, scroll = false) {
    setDescription(item.description)
    setSample(item.name)
    toast.success(`Loaded sample: ${item.label}`)
    if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function shuffle() {
    if (!samples.length) return
    const pool = samples.filter((item) => item.name !== sample)
    pickSample(pool[Math.floor(Math.random() * pool.length)] ?? samples[0])
  }

  function focusComposer() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => document.querySelector<HTMLTextAreaElement>('textarea[aria-label="About you"]')?.focus(), 400)
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
    <>
      <Container>
        {/* Hero */}
        <section className="flex flex-col items-center pt-4 text-center sm:pt-8">
          <p className="ss-rise inline-flex h-7 items-center gap-2 rounded-full border border-pink bg-pink/40 px-3 text-xs font-medium text-ink">
            <span className="flex size-4 items-center justify-center rounded-full bg-err text-[9px] text-white">
              <Sparkles className="size-2.5" />
            </span>
            Powered by a swarm of 11 AI agents
          </p>
          <h1
            className="ss-rise mt-5 text-[52px] leading-[58px] font-semibold tracking-[-0.03em] text-ink max-md:text-[42px] max-md:leading-[48px] max-sm:text-[32px] max-sm:leading-[38px]"
            style={{ ['--i' as string]: 1 }}
          >
            Find The Scholarships You
            <br />
            Actually Qualify For
          </h1>

          <div className="ss-rise mt-10 w-full max-w-[640px]" style={{ ['--i' as string]: 2 }}>
            <Composer
              description={description}
              onDescriptionChange={setDescription}
              files={files}
              onFilesChange={setFiles}
              sample={sample}
              onSampleClear={() => setSample(null)}
              onShuffle={samples.length ? shuffle : undefined}
              lang={lang}
              busy={createRun.isPending}
              onSubmit={submit}
            />
          </div>

          <div className="mt-8 w-full max-w-[640px]">
            <CoverageHints text={description} hasFiles={files.length > 0} className="justify-center" />
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {speechSupported() ? (
                <Select value={lang} onValueChange={setLang}>
                  <SelectTrigger aria-label="Spoken language" className="h-8 w-[160px] rounded-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((language) => (
                      <SelectItem key={language.value} value={language.value}>
                        Voice: {language.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                className="h-8 gap-1.5 rounded-full px-3 text-xs text-muted hover:bg-subtle hover:text-ink"
                onClick={() => setAdvancedOpen(true)}
              >
                <SlidersHorizontal className="size-3.5" strokeWidth={1.75} />
                Advanced
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-20">
          <StatRow />
        </section>

        <section className="mt-24">
          <SectionHead
            id="how"
            title="Everything you need to find your funding."
            aside="From the first sentence to the final application, the swarm understands you, checks every rule and drafts what you need."
          />
          <div className="mt-8">
            <FeatureCards />
          </div>
        </section>

        <section className="mt-24">
          <SectionHead
            center
            title={
              <>
                You don’t need the perfect profile.
                <br className="hidden sm:block" /> Just tell us where you are.
              </>
            }
            aside="Watch the agents hand work to each other, recover from failures and quote every source — live."
          />
          <div className="mt-10">
            <ProductPreview />
          </div>
          <div className="mt-8 flex justify-center">
            <button type="button" onClick={focusComposer} className="ss-key h-11 rounded-full bg-accent px-6 text-sm font-semibold text-on-accent">
              Start a search
            </button>
          </div>
        </section>

        <section className="mt-24">
          <SectionHead
            id="samples"
            title="Not sure what to write? Start from a student."
            aside="Pick a sample profile. It fills the composer so you can run a real search straight away."
          />
          <div className="mt-8">
            <ProfileCards samples={samples} onPick={(item) => pickSample(item, true)} />
          </div>
        </section>

        <section className="mt-24">
          <SectionHead
            id="agents"
            center
            title="Meet the swarm"
            aside="Eleven agents, one job each. Here’s what they do for you, in their own words."
          />
          <div className="mt-10">
            <AgentMarquee />
          </div>
        </section>

        <section className="mt-24">
          <DossierBand onStart={focusComposer} />
        </section>

        <section className="mt-24">
          <FaqSection />
        </section>
      </Container>

      <Footer />

      <AdvancedSheet
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        values={advanced}
        onChange={setAdvanced}
        meta={meta.data}
      />
    </>
  )
}
