import { useEffect, useRef, useState, type ComponentType } from 'react'
import { ArrowRight, FileUp, Loader2, Mic, PenLine, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { AttachmentChip, type IntakeAttachment } from '@/components/intake/AttachmentChip'
import { CoverageHints } from '@/components/intake/CoverageHints'
import { VoiceButton } from '@/components/intake/VoiceButton'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { wordCount } from '@/lib/coverage'
import { speechSupported } from '@/lib/speech'
import { cn } from '@/lib/cn'

const MAX_BYTES = 10 * 1024 * 1024
const MAX_FILES = 2
const LANGUAGES = [
  { value: 'en-IN', label: 'English (India)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'hi-IN', label: 'Hindi' },
]

type Mode = 'resume' | 'write' | 'speak'

const MODES: Array<{ id: Mode; label: string; hint: string; icon: ComponentType<{ className?: string; strokeWidth?: number }> }> = [
  { id: 'resume', label: 'Resume', hint: 'Upload a PDF', icon: FileUp },
  { id: 'write', label: 'Write', hint: 'Type a few lines', icon: PenLine },
  { id: 'speak', label: 'Speak', hint: 'Just talk', icon: Mic },
]

export interface ComposerValue {
  description: string
  files: IntakeAttachment[]
  sample: string | null
  modes: string[]
}

function roleFor(file: File, existing: IntakeAttachment[]): 'resume' | 'transcript' {
  const guessed = /transcript|marksheet|grade|semester/i.test(file.name) ? 'transcript' : 'resume'
  if (guessed === 'resume' && existing.some((item) => item.role === 'resume')) return 'transcript'
  if (guessed === 'transcript' && existing.some((item) => item.role === 'transcript')) {
    return 'resume'
  }
  return guessed
}

let nextId = 1

/**
 * The intake card. Three ways in — upload, write, speak — sharing one
 * description, one attachment list and one submit button.
 */
export function Composer({
  description,
  onDescriptionChange,
  files,
  onFilesChange,
  sample,
  onSampleClear,
  busy,
  onSubmit,
}: {
  description: string
  onDescriptionChange: (value: string) => void
  files: IntakeAttachment[]
  onFilesChange: (files: IntakeAttachment[]) => void
  sample: string | null
  onSampleClear: () => void
  busy: boolean
  onSubmit: (value: ComposerValue) => void
}) {
  const [mode, setMode] = useState<Mode>('write')
  const [dragging, setDragging] = useState(false)
  const [interim, setInterim] = useState('')
  const [listening, setListening] = useState(false)
  const [lang, setLang] = useState('en-IN')
  const [voiceUsed, setVoiceUsed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const dragDepth = useRef(0)
  const supported = speechSupported()

  const words = wordCount(description)
  const valid = files.length > 0 || Boolean(sample) || words >= 20

  useEffect(() => {
    const element = textRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(300, Math.max(element.scrollHeight, mode === 'speak' ? 88 : 152))}px`
  }, [description, mode])

  function addFiles(incoming: FileList | File[]) {
    const list = Array.from(incoming)
    const accepted: IntakeAttachment[] = []
    for (const file of list) {
      if (files.length + accepted.length >= MAX_FILES) {
        toast.error('You can attach at most two PDFs.')
        break
      }
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        toast.error('Only PDF files are accepted.')
        continue
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is larger than 10 MB.`)
        continue
      }
      accepted.push({ id: `file-${nextId++}`, file, role: roleFor(file, [...files, ...accepted]) })
    }
    if (accepted.length) onFilesChange([...files, ...accepted])
  }

  function handleDescription(value: string) {
    onDescriptionChange(value)
    if (sample && value.trim() === '') onSampleClear()
  }

  function appendVoice(text: string) {
    setVoiceUsed(true)
    const base = description.trimEnd()
    handleDescription(base ? `${base} ${text}` : text)
  }

  function submit() {
    if (!valid || busy) return
    const modes: string[] = []
    if (files.length) modes.push('resume')
    if (description.trim()) modes.push('text')
    if (voiceUsed) modes.push('voice')
    onSubmit({ description: description.trim(), files, sample, modes })
  }

  const textarea = (
    <Textarea
      ref={textRef}
      value={description}
      onChange={(event) => handleDescription(event.target.value)}
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault()
          submit()
        }
      }}
      placeholder={
        mode === 'speak'
          ? 'Your words appear here — edit anything before you send.'
          : 'I’m a final-year B.Tech CSE student with an 8.2 CGPA. I built a RAG chatbot and a resume parser. I want a funded master’s in AI in Germany or Canada…'
      }
      aria-label="About you"
      className="max-h-[300px] resize-none overflow-y-auto rounded-none border-0 bg-transparent px-0 py-0 text-[15px] leading-7 shadow-none focus-visible:ring-0 dark:bg-transparent"
    />
  )

  return (
    <div
      data-testid="composer"
      className={cn(
        'relative w-full overflow-hidden rounded-[var(--radius-card)] border bg-surface shadow-[var(--shadow-lift)] transition-colors',
        dragging ? 'border-accent' : 'border-line',
      )}
      onDragEnter={(event) => {
        event.preventDefault()
        dragDepth.current += 1
        setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault()
        dragDepth.current -= 1
        if (dragDepth.current <= 0) setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        dragDepth.current = 0
        setDragging(false)
        if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files)
      }}
    >
      {dragging ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-accent text-on-accent">
          <Upload className="size-6" strokeWidth={1.75} />
          <p className="text-sm font-semibold">Drop your PDF to attach it</p>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        aria-label="Attach PDF"
        onChange={(event) => {
          if (event.target.files) addFiles(event.target.files)
          event.target.value = ''
        }}
      />

      {/* Mode switch: three equal tabs with a sliding underline. */}
      <div role="tablist" aria-label="How do you want to start?" className="relative grid grid-cols-3 border-b border-line">
        {MODES.map((item) => {
          const Icon = item.icon
          const active = mode === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(item.id)}
              className={cn(
                'flex h-[60px] items-center justify-center gap-2.5 px-2 text-left transition-colors',
                active ? 'text-accent' : 'text-muted hover:text-ink',
              )}
            >
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-[8px] transition-colors',
                  active ? 'bg-accent text-on-accent' : 'bg-subtle',
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm leading-5 font-semibold">{item.label}</span>
                <span className="hidden text-[11px] leading-4 text-muted sm:block">{item.hint}</span>
              </span>
            </button>
          )
        })}
        <span
          aria-hidden="true"
          className="absolute bottom-[-1px] left-0 h-[2px] w-1/3 bg-accent transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
          style={{ transform: `translateX(${MODES.findIndex((item) => item.id === mode) * 100}%)` }}
        />
      </div>

      {files.length ? (
        <div className="flex flex-wrap gap-2 border-b border-line px-5 py-3">
          {files.map((attachment) => (
            <AttachmentChip
              key={attachment.id}
              attachment={attachment}
              onRemove={() => onFilesChange(files.filter((item) => item.id !== attachment.id))}
              onRoleChange={(role) =>
                onFilesChange(files.map((item) => (item.id === attachment.id ? { ...item, role } : item)))
              }
            />
          ))}
        </div>
      ) : null}

      <div key={mode} className="ss-rise min-h-[200px] px-5 pt-5 pb-4">
        {mode === 'resume' ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="group flex min-h-[176px] w-full flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed border-accent/40 bg-accent-soft/50 px-4 text-center transition-colors hover:border-accent hover:bg-accent-soft"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-surface text-accent shadow-card transition-transform duration-300 group-hover:-translate-y-0.5">
              <FileUp className="size-5" strokeWidth={1.75} />
            </span>
            <span>
              <span className="block text-[15px] font-semibold text-ink">Drop your resume PDF here</span>
              <span className="mt-0.5 block text-[13px] text-muted">
                or <span className="font-medium text-accent underline underline-offset-4">browse files</span> · add a
                transcript too if you have one
              </span>
            </span>
          </button>
        ) : mode === 'speak' ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                {listening ? (
                  <>
                    <span className="absolute inset-0 animate-[ss-ring_1.6s_ease-out_infinite] rounded-full bg-accent/40" aria-hidden="true" />
                    <span className="absolute inset-0 animate-[ss-ring_1.6s_ease-out_0.8s_infinite] rounded-full bg-accent/30" aria-hidden="true" />
                  </>
                ) : null}
                <VoiceButton
                  lang={lang}
                  onFinal={appendVoice}
                  onInterimChange={setInterim}
                  onListeningChange={setListening}
                  size="lg"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">
                  {listening ? 'Listening… talk naturally' : supported ? 'Tap the mic and talk' : 'Voice needs Chrome or Edge'}
                </p>
                <p className="text-[13px] text-muted">
                  Your degree, grades, projects, where you want to study and your budget.
                </p>
              </div>
              {supported ? (
                <Select value={lang} onValueChange={setLang}>
                  <SelectTrigger aria-label="Spoken language" className="h-9 w-[150px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((language) => (
                      <SelectItem key={language.value} value={language.value}>
                        {language.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
            {interim ? (
              <p className="flex items-center gap-2 text-sm text-accent italic">
                <span className="ss-eq scale-75" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                “{interim}”
              </p>
            ) : null}
            <div className="rounded-[10px] border border-line bg-canvas px-4 py-3">{textarea}</div>
          </div>
        ) : (
          textarea
        )}
      </div>

      <div className="border-t border-line bg-canvas/60 px-5 py-3">
        <CoverageHints text={description} hasFiles={files.length > 0} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
        <p className="text-xs text-muted tabular-nums">
          {files.length ? `${files.length} file${files.length > 1 ? 's' : ''} · ` : ''}
          {words} words
        </p>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button
                type="button"
                onClick={submit}
                disabled={!valid || busy}
                className="group h-11 gap-2 rounded-[10px] px-5 text-[15px] font-semibold"
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    Find scholarships
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                  </>
                )}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {busy ? 'Starting your run' : valid ? 'Start the search (Ctrl+Enter)' : 'Add a resume or at least 20 words about you'}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
