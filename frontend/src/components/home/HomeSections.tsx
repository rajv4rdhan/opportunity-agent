import type { ComponentType, ReactNode } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarPlus,
  Check,
  FileCheck2,
  FileText,
  GitBranch,
  FolderGit2,
  Loader2,
  Map,
  MessageCircleQuestion,
  Network,
  PenLine,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react'

import type { SampleInfo } from '@/api/types'
import {
  GlobeArt,
  PROFILE_ART,
  SopStackArt,
} from '@/components/art/Illustrations'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/cn'
import { useCountUp } from '@/lib/useCountUp'
import { useInView } from '@/lib/useInView'

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

export function SectionHead({
  title,
  aside,
  center = false,
  id,
}: {
  title: ReactNode
  aside?: ReactNode
  center?: boolean
  id?: string
}) {
  if (center) {
    return (
      <div id={id} className="mx-auto max-w-[640px] scroll-mt-24 text-center">
        <h2 className="text-[34px] leading-[40px] font-semibold text-ink max-sm:text-[28px] max-sm:leading-9">{title}</h2>
        {aside ? <p className="mt-3 text-[15px] leading-6 text-muted">{aside}</p> : null}
      </div>
    )
  }
  return (
    <div id={id} className="flex scroll-mt-24 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <h2 className="max-w-[420px] text-[34px] leading-[40px] font-semibold text-ink max-sm:text-[28px] max-sm:leading-9">
        {title}
      </h2>
      {aside ? <p className="max-w-[340px] text-sm leading-6 text-muted sm:text-right">{aside}</p> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

const STATS = [
  { value: 11, suffix: '', label: 'AI agents, each with one job, working as a team', tint: 'var(--ss-pink)' },
  { value: 10, suffix: ' min', label: 'average time from your words to a full dossier', tint: 'var(--ss-sky)' },
  { value: 15, suffix: '', label: 'official pages read in parallel by verifiers', tint: 'var(--ss-lilac)' },
  { value: 4, suffix: '', label: 'fallbacks per page: cache, reader, scraper, browser', tint: 'var(--ss-peach)' },
]

function StatValue({ value, suffix, run }: { value: number; suffix: string; run: boolean }) {
  const shown = useCountUp(run ? value : 0, 1000)
  return (
    <>
      {Math.round(shown)}
      {suffix}
    </>
  )
}

export function StatRow() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3)
  return (
    <div ref={ref} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {STATS.map((item) => (
        <div
          key={item.label}
          className="ss-tint rounded-[18px] border border-line bg-surface px-5 pt-6 pb-5 text-center"
          style={{ ['--tint' as string]: item.tint }}
        >
          <p className="font-display text-[34px] leading-none font-semibold text-ink tabular-nums">
            <StatValue value={item.value} suffix={item.suffix} run={inView} />
          </p>
          <p className="mx-auto mt-3 max-w-[200px] text-[13px] leading-5 text-muted">{item.label}</p>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Feature cards                                                       */
/* ------------------------------------------------------------------ */

function UnderstandMock() {
  return (
    <div className="rounded-[14px] bg-surface p-3 shadow-card">
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        {['Resume', 'Write', 'Speak'].map((chip, index) => (
          <span
            key={chip}
            className={cn(
              'rounded-full px-2 py-0.5 font-medium',
              index === 1 ? 'bg-accent text-on-accent' : 'bg-subtle text-muted',
            )}
          >
            {chip}
          </span>
        ))}
      </div>
      <p className="mt-2 rounded-[10px] border border-line px-2.5 py-2 text-[11px] leading-4 text-muted">
        B.Tech CSE, 8.2 CGPA, RAG chatbot… funded MS in AI, Germany or Canada.
      </p>
      <div className="mt-2 flex items-center justify-between rounded-[10px] bg-mint px-2.5 py-1.5 text-[10px] text-ink">
        <span className="font-semibold">Profile ready</span>
        <span className="font-mono">6 / 7 facts</span>
      </div>
    </div>
  )
}

function VerifyMock() {
  const rules = [
    { ok: true, text: 'Bachelor’s in a related field' },
    { ok: true, text: 'CGPA above 7.5 / 10' },
    { ok: false, text: 'IELTS 6.5 required' },
  ]
  return (
    <div className="rounded-[14px] bg-surface p-3 shadow-card">
      <div className="flex items-center gap-2 text-[11px] font-semibold text-ink">
        <span className="relative flex size-6 items-center justify-center rounded-full bg-mint">
          <ShieldCheck className="size-3.5" strokeWidth={2} />
          <span className="absolute inset-0 animate-ping rounded-full bg-mint opacity-60" />
        </span>
        Reading daad.de…
      </div>
      <ul className="mt-2 space-y-1.5">
        {rules.map((rule) => (
          <li key={rule.text} className="flex items-center gap-1.5 text-[11px] text-ink">
            <span
              className={cn(
                'flex size-4 items-center justify-center rounded-[4px]',
                rule.ok ? 'bg-accent text-on-accent' : 'bg-pink text-err',
              )}
            >
              {rule.ok ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
            </span>
            {rule.text}
          </li>
        ))}
      </ul>
      <p className="mt-2 border-l-2 border-accent pl-2 text-[10px] leading-4 text-muted italic">
        “…a first degree with above-average results.”
      </p>
    </div>
  )
}

const FEATURES: Array<{
  title: string
  body: string
  bg: string
  visual: ReactNode
}> = [
  {
    title: 'Understand',
    body: 'Upload a resume, write a few lines or just talk. Agents turn it into a clean profile and find projects your resume forgot.',
    bg: 'bg-peach',
    visual: <UnderstandMock />,
  },
  {
    title: 'Verify',
    body: 'Verifiers open official pages in parallel, test every rule against your profile and quote the exact sentence.',
    bg: 'bg-mint',
    visual: <VerifyMock />,
  },
  {
    title: 'Apply',
    body: 'Get your top five, the deadlines for your calendar and a statement of purpose drafted — then fact-checked.',
    bg: 'bg-pink',
    visual: (
      <div className="flex h-full items-center justify-center rounded-[14px] bg-surface p-2 shadow-card">
        <SopStackArt className="h-[150px] w-auto" />
      </div>
    ),
  },
]

export function FeatureCards() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {FEATURES.map((feature, index) => (
        <article
          key={feature.title}
          className={cn(
            'ss-rise flex flex-col rounded-[22px] border border-ink/10 p-3 transition-transform duration-300 hover:-translate-y-1',
            feature.bg,
          )}
          style={{ ['--i' as string]: index }}
        >
          <div className="h-[200px]">{feature.visual}</div>
          <div className="px-2 pt-4 pb-2">
            <h3 className="text-lg font-semibold text-ink">{feature.title}</h3>
            <p className="mt-1 text-[13px] leading-5 text-ink/70">{feature.body}</p>
          </div>
        </article>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Product preview (a static mock of the live run)                     */
/* ------------------------------------------------------------------ */

const PREVIEW_AGENTS: Array<{ name: string; icon: ComponentType<{ className?: string }>; state: 'done' | 'running' | 'idle' }> = [
  { name: 'Profile Analyst', icon: FileText, state: 'done' },
  { name: 'GitHub Enricher', icon: FolderGit2, state: 'done' },
  { name: 'Planner', icon: Map, state: 'done' },
  { name: 'Scout', icon: Search, state: 'done' },
  { name: 'Verifiers ×15', icon: ShieldCheck, state: 'running' },
  { name: 'Matcher', icon: Network, state: 'idle' },
  { name: 'Supervisor', icon: GitBranch, state: 'idle' },
  { name: 'Ranker', icon: Trophy, state: 'idle' },
  { name: 'SOP Writer', icon: PenLine, state: 'idle' },
  { name: 'Critic', icon: ScanSearch, state: 'idle' },
]

export function ProductPreview() {
  return (
    <div className="ss-device mx-auto max-w-[880px] rounded-[28px] p-3 sm:p-4">
      <div className="overflow-hidden rounded-[18px] bg-surface">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-pink" />
            <span className="size-2.5 rounded-full bg-peach" />
            <span className="size-2.5 rounded-full bg-mint" />
          </div>
          <span className="rounded-full bg-subtle px-3 py-0.5 font-mono text-[10px] text-muted">scholarswarm / live run</span>
          <span className="w-10" />
        </div>
        <div className="grid gap-0 sm:grid-cols-[220px_minmax(0,1fr)]">
          <ul className="hidden border-r border-line p-3 sm:block">
            {PREVIEW_AGENTS.map((agent) => {
              const Icon = agent.icon
              return (
                <li
                  key={agent.name}
                  className={cn(
                    'flex items-center gap-2 rounded-[10px] px-2 py-1.5 text-[12px]',
                    agent.state === 'running' && 'bg-accent text-on-accent',
                    agent.state === 'idle' && 'text-muted',
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate">{agent.name}</span>
                  {agent.state === 'done' ? (
                    <Check className="ml-auto size-3.5 text-accent" strokeWidth={2.5} />
                  ) : agent.state === 'running' ? (
                    <Loader2 className="ml-auto size-3.5 animate-spin" />
                  ) : null}
                </li>
              )
            })}
          </ul>
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">Step 4 of 6 · Verify</p>
                <p className="font-display text-xl font-semibold text-ink">Rahul’s funding search</p>
              </div>
              <span className="rounded-full bg-mint px-2.5 py-1 font-mono text-xs text-ink">01:28</span>
            </div>
            <div className="grid grid-cols-6 gap-1.5" aria-hidden="true">
              {[1, 1, 1, 0.5, 0, 0].map((value, index) => (
                <span key={index} className="h-1.5 overflow-hidden rounded-full bg-subtle">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${value * 100}%` }} />
                </span>
              ))}
            </div>
            {[
              { who: 'Planner', bg: 'bg-sky', text: 'Splitting the search across Canada, Germany and Singapore: government schemes, university merit awards and paid research roles.' },
              { who: 'Verifiers', bg: 'bg-mint', text: 'Verified: MS in AI at NTU — rules quoted from ntu.edu.sg. 4 pages still reading.' },
              { who: 'Scout', bg: 'bg-peach', text: 'Tavily timed out → switched to Exa. 15 new candidate pages found.' },
            ].map((message, index) => (
              <div
                key={message.who}
                className="ss-rise flex gap-2.5"
                style={{ ['--i' as string]: index + 2 }}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-accent text-on-accent">
                  <Sparkles className="size-3.5" />
                </span>
                <div className={cn('min-w-0 flex-1 rounded-[12px] px-3 py-2', message.bg)}>
                  <p className="text-[11px] font-semibold text-ink">{message.who}</p>
                  <p className="text-[12px] leading-5 text-ink/80">{message.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sample profile cards (start from someone like you)                  */
/* ------------------------------------------------------------------ */

export function ProfileCards({ samples, onPick }: { samples: SampleInfo[]; onPick: (sample: SampleInfo) => void }) {
  if (!samples.length) return null
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {samples.map((sample, index) => {
        const Art = PROFILE_ART[index % PROFILE_ART.length]
        const form = (sample.form ?? {}) as { target_degree?: string; target_fields?: string[] }
        const subtitle = [form.target_degree, (form.target_fields ?? [])[0]].filter(Boolean).join(' · ')
        return (
          <article
            key={sample.name}
            className="group flex flex-col rounded-[20px] border border-line bg-surface p-4 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[var(--shadow-lift)]"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <h3 className="text-[17px] font-semibold text-ink">{sample.label}</h3>
                {subtitle ? <p className="truncate text-xs text-muted">{subtitle}</p> : null}
              </div>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors group-hover:bg-accent group-hover:text-on-accent">
                <ArrowUpRight className="size-3.5" />
              </span>
            </div>
            <Art className="mx-auto my-3 h-[120px] w-auto transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-2" />
            <p className="line-clamp-2 text-[13px] leading-5 text-muted" title={sample.description}>
              “{sample.description}”
            </p>
            <button
              type="button"
              onClick={() => onPick(sample)}
              aria-label={`Use ${sample.label}'s profile`}
              className="mt-3 inline-flex h-8 w-fit items-center gap-1 text-sm font-semibold text-ink hover:text-accent"
            >
              Use profile <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </article>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Agents marquee (each agent describes its job)                       */
/* ------------------------------------------------------------------ */

const AGENT_LINES = [
  { name: 'Profile Analyst', role: 'Reads you', bg: 'bg-lilac', text: 'I read your resume, transcript and words, and turn them into one clean profile — grades, tests, goals, budget.' },
  { name: 'GitHub Enricher', role: 'Digs deeper', bg: 'bg-pink', text: 'I open your GitHub and surface projects your resume forgot, so they count towards your matches.' },
  { name: 'Planner', role: 'Thinks first', bg: 'bg-mint', text: 'I write ten targeted searches for your degree, field and countries — and re-plan if results are thin.' },
  { name: 'Verifiers', role: 'Read the fine print', bg: 'bg-peach', text: 'We open official pages in parallel and quote every rule word for word. No quote, no claim.' },
  { name: 'Ranker', role: 'Picks your five', bg: 'bg-sky', text: 'I weigh fit, funding and deadlines, then explain in plain words why each match suits you.' },
  { name: 'Critic', role: 'Keeps it honest', bg: 'bg-lilac', text: 'I fact-check your statement of purpose against your profile and send it back until it holds up.' },
]

export function AgentMarquee() {
  const row = [...AGENT_LINES, ...AGENT_LINES]
  return (
    <div className="relative -mx-4 overflow-hidden sm:-mx-6 lg:-mx-8">
      <div className="ss-marquee flex w-max gap-4 px-4">
        {row.map((agent, index) => (
          <figure
            key={`${agent.name}-${index}`}
            aria-hidden={index >= AGENT_LINES.length}
            className={cn('flex w-[300px] shrink-0 flex-col justify-between rounded-[18px] p-5 sm:w-[340px]', agent.bg)}
          >
            <blockquote className="text-[15px] leading-6 text-ink">“{agent.text}”</blockquote>
            <figcaption className="mt-6">
              <p className="font-display text-[15px] font-semibold text-ink">{agent.name}</p>
              <p className="text-xs text-ink/60">{agent.role}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Dossier band (what you get)                                         */
/* ------------------------------------------------------------------ */

const BAR_WIDTHS = [36, 22, 48, 30, 18, 42, 26, 52, 20, 38, 30, 46, 24, 34, 50, 22, 40, 28, 44, 18]

function SideBars({ flip = false }: { flip?: boolean }) {
  return (
    <div aria-hidden="true" className={cn('absolute inset-y-6 hidden flex-col justify-between md:flex', flip ? 'right-0 items-end' : 'left-0 items-start')}>
      {BAR_WIDTHS.map((width, index) => (
        <span
          key={index}
          className="block h-[7px] rounded-full bg-accent"
          style={{ width, animation: `ss-bob ${2 + (index % 5) * 0.4}s ease-in-out ${index * 0.08}s infinite` }}
        />
      ))}
    </div>
  )
}

const DOSSIER_ITEMS = [
  { icon: Trophy, text: 'Your top 5 matches, ranked and explained' },
  { icon: BadgeCheck, text: 'Every rule checked, with the official quote' },
  { icon: CalendarPlus, text: 'Deadlines exported to your calendar (.ics)' },
  { icon: PenLine, text: 'A statement of purpose, drafted and fact-checked' },
  { icon: MessageCircleQuestion, text: '“Unlock more”: what one test score would open' },
  { icon: FileCheck2, text: 'A full report you can download or print' },
]

export function DossierBand({ onStart }: { onStart: () => void }) {
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-subtle px-4 py-14 sm:px-16">
      <SideBars />
      <SideBars flip />
      <div className="mx-auto max-w-[460px] text-center">
        <h2 className="text-[30px] leading-9 font-semibold text-ink">Your funding dossier</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          One search, everything you need to apply — with a source for every claim.
        </p>
      </div>
      <div className="relative mx-auto mt-8 max-w-[360px]">
        <div className="ss-device rounded-[26px] p-3">
          <div className="rounded-[18px] bg-surface px-6 pt-6 pb-5">
            <div className="flex items-start justify-center gap-2">
              <span className="font-display text-[44px] leading-none font-semibold text-ink">~10</span>
              <span className="mt-1 font-display text-lg font-semibold text-ink">min</span>
            </div>
            <p className="mt-1 text-center text-xs text-muted">from your first words to the full dossier</p>
            <ul className="mt-5 space-y-2.5">
              {DOSSIER_ITEMS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5 text-[13px] leading-5 text-ink">
                  <Icon className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={2} />
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center pt-4 pb-1">
            <button type="button" onClick={onStart} className="ss-key-ink inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold">
              Start my dossier <Sparkles className="size-4" />
            </button>
          </div>
        </div>
        {/* The cable, like the reference device plugged in. */}
        <div aria-hidden="true" className="mx-auto flex w-fit flex-col items-center">
          <span className="h-6 w-3 rounded-b-[4px] bg-[#9c84f2]" />
          <span className="h-10 w-1.5 bg-[#9c84f2]" />
        </div>
      </div>
      <div className="mx-auto mt-2 flex max-w-[360px] justify-center">
        <GlobeArt className="h-[90px] w-auto opacity-90" />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */

const FAQ = [
  {
    q: 'Do I need a resume?',
    a: 'No. A resume helps, but a few written or spoken sentences about your degree, grades, goals and budget are enough to start.',
  },
  {
    q: 'Where do the results come from?',
    a: 'Verifier agents open official university, government and foundation pages and quote the rule they used. Anything without a source is marked as unverified.',
  },
  {
    q: 'Which countries and degrees does it cover?',
    a: 'Any. The planner builds searches for the countries, degree and field you mention — master’s, PhD, MBA and more.',
  },
  {
    q: 'Does voice input work on my browser?',
    a: 'Voice uses the browser’s built-in speech recognition, available in Chrome and Edge. You can always type instead.',
  },
  {
    q: 'What happens to my files?',
    a: 'They are used only for your search: the agents extract the text and send it to the language model that powers the run. Results are stored with your run so you can reopen or replay it.',
  },
]

export function FaqSection() {
  return (
    <section id="faq" className="grid scroll-mt-24 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
      <div>
        <h2 className="text-[34px] leading-[40px] font-semibold text-ink max-sm:text-[28px]">Frequently asked questions</h2>
        <p className="mt-3 max-w-[340px] text-sm leading-6 text-muted">
          Still curious? Pick a sample student above and watch a real search run end to end.
        </p>
      </div>
      <Accordion type="single" collapsible defaultValue="faq-0" className="overflow-hidden rounded-[18px] bg-accent p-1.5">
        {FAQ.map((item, index) => (
          <AccordionItem key={item.q} value={`faq-${index}`} className="border-b border-white/20 last:border-b-0">
            <AccordionTrigger className="px-4 py-3.5 text-[15px] font-medium text-on-accent hover:no-underline [&>svg]:text-on-accent">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="mx-1.5 mb-1.5 rounded-[12px] bg-surface px-4 py-3 text-sm leading-6 text-ink">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
