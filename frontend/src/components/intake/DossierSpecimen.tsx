import { Check, ExternalLink, X } from 'lucide-react'

/**
 * Blueprint sheet: one example dossier page with lettered callouts pinned to
 * it, and a drafting-style legend underneath. Markers live inside the paper,
 * so they move with it and can never collide with the notes.
 */

const NOTES = [
  { id: 'A', title: 'Ranked for you', body: 'by fit, funding and deadline' },
  { id: 'B', title: 'Deadline checked', body: 'read from the page, never guessed' },
  { id: 'C', title: 'Every rule tested', body: 'against your own profile' },
  { id: 'D', title: 'Quoted word for word', body: 'with a link to the source' },
]

const RULES = [
  { ok: true, text: 'Bachelor’s in a related field' },
  { ok: true, text: 'Above-average grades · 8.2 / 10' },
  { ok: false, text: 'IELTS 6.5 · not provided yet' },
  { ok: true, text: 'Degree finished within 6 years' },
]

function Marker({ id, className, delay }: { id: string; className: string; delay: number }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute z-10 flex size-6 items-center justify-center rounded-full border-2 border-[#1f56e0] bg-white font-mono text-[11px] font-bold text-[#1f56e0] shadow-[0_4px_10px_-2px_rgb(0_0_0/0.4)] ${className}`}
      style={{ animation: `ss-pop-in 0.45s cubic-bezier(.2,1.4,.4,1) ${delay}s both` }}
    >
      {id}
    </span>
  )
}

function Paper() {
  return (
    <div
      className="relative w-[78%] max-w-[340px] rounded-[6px] bg-white p-4 text-[#0a1f44] shadow-[0_28px_50px_-22px_rgb(0_0_0/0.6)]"
      style={{ animation: 'ss-float 7s ease-in-out infinite', transformOrigin: '50% 50%' }}
    >
      <Marker id="A" className="-top-3 -right-3" delay={0.3} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[9px] tracking-[0.12em] text-[#5a6a85] uppercase">Match 01 · example</p>
          <p className="mt-1 text-[15px] leading-[19px] font-semibold">DAAD Study Scholarship</p>
          <p className="text-[11px] text-[#5a6a85]">Master’s · Germany</p>
        </div>
        <div className="text-right">
          <p className="text-[28px] leading-none font-semibold text-[#1f56e0] tabular-nums">87</p>
          <p className="font-mono text-[9px] text-[#5a6a85] uppercase">% fit</p>
        </div>
      </div>

      <div className="relative mt-3 grid grid-cols-2 border-y border-[#dfe5f0] text-[11px]">
        <div className="border-r border-[#dfe5f0] py-2 pr-2">
          <p className="font-mono text-[8px] tracking-[0.12em] text-[#5a6a85] uppercase">Funding</p>
          <p className="font-semibold">€992 / month</p>
        </div>
        <div className="py-2 pl-2">
          <p className="font-mono text-[8px] tracking-[0.12em] text-[#5a6a85] uppercase">Deadline</p>
          <p className="font-semibold">
            15 Oct <span className="font-normal text-[#5a6a85]">· 38 days</span>
          </p>
        </div>
        <Marker id="B" className="top-[calc(50%-12px)] -right-7" delay={0.5} />
      </div>

      <ul className="relative mt-3 space-y-1.5">
        {RULES.map((rule) => (
          <li key={rule.text} className="flex items-center gap-1.5 text-[11px]">
            <span
              className={
                rule.ok
                  ? 'flex size-3.5 shrink-0 items-center justify-center rounded-[3px] bg-[#1f56e0] text-white'
                  : 'flex size-3.5 shrink-0 items-center justify-center rounded-[3px] bg-[#fcebee] text-[#c8283b]'
              }
            >
              {rule.ok ? <Check className="size-2.5" strokeWidth={3} /> : <X className="size-2.5" strokeWidth={3} />}
            </span>
            <span className={rule.ok ? '' : 'text-[#c8283b]'}>{rule.text}</span>
          </li>
        ))}
        <Marker id="C" className="top-[calc(50%-12px)] -right-7" delay={0.7} />
      </ul>

      <blockquote className="relative mt-3 border-l-2 border-[#1f56e0] bg-[#f6f8fc] py-1.5 pr-2 pl-2 text-[10px] leading-[14px] text-[#33415c] italic">
        “Applicants must have completed a Bachelor’s degree … with above-average results.”
        <span className="mt-0.5 block font-mono text-[8px] text-[#1f56e0] not-italic">daad.de · official page</span>
        <Marker id="D" className="top-[calc(50%-12px)] -right-7" delay={0.9} />
      </blockquote>

      <span className="mt-3 flex h-7 items-center justify-center gap-1 rounded-[5px] bg-[#1f56e0] text-[11px] font-semibold text-white">
        Apply on daad.de <ExternalLink className="size-3" strokeWidth={2} />
      </span>
    </div>
  )
}

export function DossierSpecimen() {
  return (
    <figure
      aria-label="Example of a ScholarSwarm result, annotated"
      className="ss-blueprint relative flex flex-col overflow-hidden rounded-[18px] p-3"
    >
      <div className="flex h-full flex-col border border-white/35">
        <div className="flex items-center justify-between px-4 pt-3 font-mono text-[10px] tracking-[0.14em] text-white/85">
          <span>FIG. 01 — YOUR DOSSIER, ANNOTATED</span>
          <span className="text-white/50">SHEET 1/6</span>
        </div>

        <div className="flex justify-center px-6 pt-8 pb-10">
          <Paper />
        </div>

        <ol className="grid grid-cols-2 border-t border-white/35">
          {NOTES.map((note, index) => (
            <li
              key={note.id}
              className={`flex gap-2.5 px-4 py-3 ${index % 2 === 1 ? 'border-l border-white/35' : ''} ${index >= 2 ? 'border-t border-white/35' : ''}`}
              style={{ animation: `ss-fade 0.4s ease ${0.3 + index * 0.2}s both` }}
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white font-mono text-[10px] font-bold text-[#0f3aa8]">
                {note.id}
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] leading-4 font-semibold text-white">{note.title}</span>
                <span className="block font-mono text-[10px] leading-4 text-white/65">{note.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </figure>
  )
}
