import { useCallback, useEffect, useRef, useState } from 'react'

interface SpeechAlternativeLike {
  transcript: string
}

interface SpeechResultLike {
  isFinal: boolean
  0: SpeechAlternativeLike
}

interface SpeechResultListLike {
  length: number
  [index: number]: SpeechResultLike
}

interface SpeechEventLike {
  resultIndex: number
  results: SpeechResultListLike
}

interface SpeechErrorLike {
  error: string
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechEventLike) => void) | null
  onerror: ((event: SpeechErrorLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechConstructor = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechConstructor
    webkitSpeechRecognition?: SpeechConstructor
  }
}

let activeStop: (() => void) | null = null

function constructorFor(): SpeechConstructor | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

function errorMessage(code: string): string {
  if (code === 'not-allowed') return 'Microphone permission denied'
  if (code === 'no-speech') return "Didn't catch that — try again"
  return 'Voice input stopped'
}

export interface SpeechOptions {
  lang?: string
  onFinal?: (text: string) => void
}

export interface SpeechState {
  supported: boolean
  listening: boolean
  interim: string
  error: string | null
  start: () => void
  stop: () => void
}

export function useSpeechRecognition({ lang = 'en-IN', onFinal }: SpeechOptions = {}): SpeechState {
  const [supported] = useState(() => constructorFor() !== null)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const processedRef = useRef<Set<number>>(new Set())
  const onFinalRef = useRef(onFinal)

  useEffect(() => {
    onFinalRef.current = onFinal
  }, [onFinal])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    activeStop = null
    setListening(false)
    setInterim('')
  }, [])

  const start = useCallback(() => {
    const Constructor = constructorFor()
    if (!Constructor) {
      setError('Voice works in Chrome or Edge')
      return
    }
    activeStop?.()
    setError(null)
    setInterim('')
    processedRef.current = new Set()

    const recognition = new Constructor()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event) => {
      let currentInterim = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const text = result[0]?.transcript ?? ''
        if (result.isFinal) {
          if (!processedRef.current.has(index)) {
            processedRef.current.add(index)
            const cleaned = text.trim()
            if (cleaned) onFinalRef.current?.(cleaned)
          }
        } else {
          currentInterim += text
        }
      }
      setInterim(currentInterim.trim())
    }
    recognition.onerror = (event) => {
      setError(errorMessage(event.error))
      setListening(false)
      activeStop = null
    }
    recognition.onend = () => {
      setListening(false)
      setInterim('')
      activeStop = null
    }

    recognitionRef.current = recognition
    activeStop = stop
    recognition.start()
    setListening(true)
  }, [lang, stop])

  useEffect(
    () => () => {
      recognitionRef.current?.abort()
      if (activeStop === stop) activeStop = null
    },
    [stop],
  )

  return { supported, listening, interim, error, start, stop }
}
