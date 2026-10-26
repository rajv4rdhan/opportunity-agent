import { useEffect } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'
import { useSpeechRecognition } from '@/lib/speech'

export function VoiceButton({
  lang = 'en-IN',
  onFinal,
  onInterimChange,
  className,
}: {
  lang?: string
  onFinal: (text: string) => void
  onInterimChange?: (text: string) => void
  className?: string
}) {
  const { supported, listening, interim, error, start, stop } = useSpeechRecognition({
    lang,
    onFinal,
  })

  useEffect(() => {
    onInterimChange?.(interim)
  }, [interim, onInterimChange])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  if (!supported) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled
              aria-label="Voice input unavailable"
              className={cn('size-8 rounded-full text-muted', className)}
            >
              <MicOff className="size-4" strokeWidth={1.75} />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Voice works in Chrome or Edge</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={listening ? 'default' : 'ghost'}
          size="icon"
          onClick={listening ? stop : start}
          aria-label={listening ? 'Stop voice input' : 'Speak'}
          className={cn(
            'size-8 rounded-full',
            listening
              ? 'bg-accent text-primary-foreground ring-4 ring-accent/15 hover:bg-accent/90'
              : 'text-muted hover:bg-subtle hover:text-ink',
            className,
          )}
        >
          {listening ? (
            <MicOff className="size-4" strokeWidth={1.75} />
          ) : (
            <Mic className="size-4" strokeWidth={1.75} />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{listening ? 'Stop listening' : 'Speak'}</TooltipContent>
    </Tooltip>
  )
}
