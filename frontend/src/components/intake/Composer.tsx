import { useEffect, useRef, useState } from 'react'
import { Loader2, Paperclip, Shuffle, Sparkles, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { AttachmentChip, type IntakeAttachment } from '@/components/intake/AttachmentChip'
import { DotMatrix, type MatrixMode } from '@/components/intake/DotMatrix'
import { VoiceButton } from '@/components/intake/VoiceButton'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { coverage, wordCount } from '@/lib/coverage'
import { cn } from '@/lib/cn'

const MAX_BYTES = 10 * 1024 * 1024
const MAX_FILES = 2

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

const KEY = 'ss-key-ink flex size-11 shrink-0 items-center justify-center rounded-full'

/**
 * The intake "device": a lavender body with a white input window, a reactive
 * dot-matrix grille and four round keys — attach, speak, find, shuffle.
 */
export function Composer({
  description,
  onDescriptionChange,
  files,
  onFilesChange,
  sample,
  onSampleClear,
  onShuffle,
  lang = 'en-IN',
  busy,
  onSubmit,
}: {
  description: string
  onDescriptionChange: (value: string) => void
  files: IntakeAttachment[]
  onFilesChange: (files: IntakeAttachment[]) => void
  sample: string | null
  onSampleClear: () => void
  onShuffle?: () => void
  lang?: string
  busy: boolean
  onSubmit: (value: ComposerValue) => void
}) {
  const [dragging, setDragging] = useState(false)
  const [interim, setInterim] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceUsed, setVoiceUsed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const dragDepth = useRef(0)

  const words = wordCount(description)
  const valid = files.length > 0 || Boolean(sample) || words >= 20
  const covered = Object.values(coverage(description)).filter(Boolean).length
  const mode: MatrixMode = busy ? 'busy' : listening ? 'listening' : words > 0 || files.length ? 'typing' : 'idle'

  useEffect(() => {
    const element = textRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(220, Math.max(element.scrollHeight, 76))}px`
  }, [description])

  function addFiles(incoming: FileList | File[]) {
    const accepted: IntakeAttachment[] = []
    for (const file of Array.from(incoming)) {
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

  return (
    <div
      data-testid="composer"
      className={cn('ss-device relative w-full rounded-[30px] p-3 sm:p-4', dragging && 'ring-4 ring-accent/40')}
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
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-[30px] bg-accent/90 text-on-accent">
          <Upload className="size-7" strokeWidth={1.75} />
          <p className="font-display text-lg font-semibold">Drop your resume PDF</p>
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

      {/* The input window. */}
      <div className="rounded-[20px] border-2 border-white/70 bg-surface px-5 pt-4 pb-3 shadow-[inset_0_2px_6px_rgb(46_35_99/0.08)]">
        {files.length ? (
          <div className="mb-3 flex flex-wrap gap-2">
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
          placeholder="I’m a final-year B.Tech CSE student with an 8.2 CGPA. I built a RAG chatbot and a resume parser, and I want a funded master’s in AI in Germany or Canada…"
          aria-label="About you"
          className="max-h-[220px] resize-none overflow-y-auto rounded-none border-0 bg-transparent p-0 text-[15px] leading-6 text-ink shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        {interim ? (
          <p className="mt-2 truncate text-sm text-accent italic" title={interim}>
            “{interim}”
          </p>
        ) : null}
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
          <span className="tabular-nums">
            {files.length ? `${files.length} file${files.length > 1 ? 's' : ''} · ` : ''}
            {words} words
          </span>
          <span className="hidden sm:inline">Ctrl + Enter to start</span>
        </div>
      </div>

      {/* Speaker grille / dot-matrix display. */}
      <div className="flex items-center justify-center gap-6 px-2 pt-5 pb-4">
        <DotMatrix mode={mode} level={covered} columns={14} className="hidden sm:grid" />
        <DotMatrix mode={mode} level={covered} columns={18} />
        <DotMatrix mode={mode} level={covered} columns={14} className="hidden sm:grid" />
      </div>

      {/* Keys. */}
      <div className="flex items-center justify-center gap-3 pb-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={() => inputRef.current?.click()} className={KEY} aria-label="Attach resume PDF">
              <Paperclip className="size-[18px]" strokeWidth={2} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Attach resume or transcript (PDF)</TooltipContent>
        </Tooltip>

        <VoiceButton
          lang={lang}
          onFinal={appendVoice}
          onInterimChange={setInterim}
          onListeningChange={setListening}
          size="device"
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button
                type="button"
                onClick={submit}
                disabled={!valid || busy}
                className="ss-key-ink h-11 gap-2 rounded-full px-6 text-[15px] font-semibold"
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    Find scholarships
                    <Sparkles className="size-4" strokeWidth={2} />
                  </>
                )}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {busy ? 'Starting your run' : valid ? 'Start the search' : 'Add a resume or at least 20 words about you'}
          </TooltipContent>
        </Tooltip>

        {onShuffle ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={onShuffle} className={KEY} aria-label="Surprise me with a sample student">
                <Shuffle className="size-[18px]" strokeWidth={2} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Try a random sample student</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  )
}
