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
  onListeningChange,
  size = 'sm',
  className,
}: {
  lang?: string
  onFinal: (text: string) => void
  onInterimChange?: (text: string) => void
  onListeningChange?: (listening: boolean) => void
  size?: 'sm' | 'lg'
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

  useEffect(() => {
    onListeningChange?.(listening)
  }, [listening, onListeningChange])

  const large = size === 'lg'

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
              className={cn(large ? 'size-14 rounded-full bg-subtle text-muted' : 'size-8 rounded-full text-muted', className)}
            >
              <MicOff className={large ? 'size-6' : 'size-4'} strokeWidth={1.75} />
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
            'relative rounded-full transition-all duration-300',
            large
              ? listening
                ? 'size-14 bg-accent text-on-accent hover:bg-accent'
                : 'size-14 bg-accent text-on-accent shadow-[var(--shadow-lift)] hover:-translate-y-0.5 hover:bg-accent'
              : listening
                ? 'size-8 bg-accent text-on-accent hover:bg-accent/90'
                : 'size-8 text-muted hover:bg-subtle hover:text-ink',
            className,
          )}
        >
          {listening ? (
            <span className="ss-eq" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          ) : (
            <Mic className={large ? 'size-6' : 'size-4'} strokeWidth={1.75} />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{listening ? 'Stop listening' : 'Speak'}</TooltipContent>
    </Tooltip>
  )
}
