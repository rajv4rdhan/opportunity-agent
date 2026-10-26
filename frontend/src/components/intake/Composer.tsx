import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Loader2, Paperclip, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { AttachmentChip, type IntakeAttachment } from '@/components/intake/AttachmentChip'
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
  { value: 'en-IN', label: 'EN-IN' },
  { value: 'en-US', label: 'EN-US' },
  { value: 'hi-IN', label: 'HI-IN' },
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
  const [dragging, setDragging] = useState(false)
  const [interim, setInterim] = useState('')
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
    element.style.height = `${Math.min(320, Math.max(48, element.scrollHeight))}px`
  }, [description])

  function addFiles(incoming: FileList | File[]) {
    const list = Array.from(incoming)
    const accepted: IntakeAttachment[] = []
    const working = [...files]
    for (const file of list) {
      if (working.length >= MAX_FILES) {
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
      const attachment: IntakeAttachment = {
        id: `file-${nextId++}`,
        file,
        role: roleFor(file, [...working, ...accepted]),
      }
      accepted.push(attachment)
    }
    if (accepted.length) onFilesChange([...files, ...accepted])
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files)
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
      className={cn(
        'relative w-full rounded-[16px] border border-line bg-surface shadow-card transition-shadow focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10',
        dragging && 'border-accent',
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
      onDrop={onDrop}
    >
      {dragging ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[16px] border-2 border-dashed border-accent bg-accent-soft/80 text-sm font-medium text-accent">
          <Upload className="mr-2 size-4" /> Drop PDF to attach
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

      {files.length ? (
        <div className="flex flex-wrap gap-2 px-4 pt-4">
          {files.map((attachment) => (
            <AttachmentChip
              key={attachment.id}
              attachment={attachment}
              onRemove={() => onFilesChange(files.filter((item) => item.id !== attachment.id))}
              onRoleChange={(role) =>
                onFilesChange(
                  files.map((item) =>
                    item.id === attachment.id ? { ...item, role } : item,
                  ),
                )
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
        placeholder="Tell us about yourself — your degree, grades, projects, and what you want to study and where. Or drop your resume here."
        aria-label="About you"
        className="min-h-[132px] max-h-[320px] resize-none overflow-y-auto border-0 bg-transparent px-4 pt-4 pb-2 text-[15px] leading-6 shadow-none focus-visible:ring-0 dark:bg-transparent"
      />

      {interim ? (
        <div className="flex items-center gap-2 px-4 pb-2 text-sm italic text-muted">
          <span className="size-1.5 animate-pulse rounded-full bg-err" aria-hidden="true" />
          Listening… “{interim}”
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-3 py-2">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-muted hover:bg-subtle hover:text-ink"
                onClick={() => inputRef.current?.click()}
                aria-label="Attach PDF"
              >
                <Paperclip className="size-4" strokeWidth={1.75} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Attach PDF (resume or transcript)</TooltipContent>
          </Tooltip>

          {supported ? (
            <>
              <VoiceButton
                lang={lang}
                onFinal={appendVoice}
                onInterimChange={setInterim}
              />
              <Select value={lang} onValueChange={setLang}>
                <SelectTrigger
                  aria-label="Spoken language"
                  className="h-8 w-[92px] border-0 bg-transparent text-xs text-muted shadow-none focus-visible:ring-0 dark:bg-transparent"
                >
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
            </>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="text-xs text-muted tabular-nums">{words} words</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button
                  type="button"
                  onClick={submit}
                  disabled={!valid || busy}
                  className="h-9 gap-1.5 px-3 sm:px-4"
                >
                  {busy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Starting…
                    </>
                  ) : (
                    <>
                      Find scholarships
                      <ArrowRight className="size-4" strokeWidth={1.75} />
                    </>
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {busy
                ? 'Starting your run'
                : valid
                  ? 'Start the search'
                  : 'Add a resume or at least 20 words about you'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
