import { Map, PenLine, Scale, Search, ShieldCheck, UserSearch } from 'lucide-react'

const STEPS = [
  { label: 'Understand', caption: 'reads you', icon: UserSearch },
  { label: 'Plan', caption: 'picks queries', icon: Map },
  { label: 'Research', caption: 'searches the web', icon: Search },
  { label: 'Verify', caption: 'checks official pages', icon: ShieldCheck },
  { label: 'Decide', caption: 'ranks matches', icon: Scale },
  { label: 'Write', caption: 'drafts your SOP', icon: PenLine },
]

export function HowItWorks() {
  return (
    <section className="mx-auto w-full max-w-[880px]">
      <p className="mb-8 text-center text-[11px] leading-4 font-semibold tracking-[0.08em] text-muted uppercase">
        How it works
      </p>
      <div className="relative">
        <div
          className="absolute top-5 right-[8.333%] left-[8.333%] hidden h-px bg-line sm:block"
          aria-hidden="true"
        />
        <div className="relative grid grid-cols-3 gap-y-8 sm:grid-cols-6">
          {STEPS.map(({ label, caption, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center text-center">
              <div className="flex size-10 items-center justify-center rounded-full border border-line bg-surface">
                <Icon className="size-[18px] text-accent" strokeWidth={1.75} />
              </div>
              <p className="mt-3 text-sm font-medium">{label}</p>
              <p className="mt-0.5 max-w-[104px] text-xs leading-[18px] text-muted">{caption}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
