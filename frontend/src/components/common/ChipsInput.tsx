import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

export function ChipsInput({
  values,
  onChange,
  placeholder,
  suggestions,
  id,
}: {
  values: string[]
  onChange: (values: string[]) => void
  placeholder: string
  suggestions?: string[]
  id?: string
}) {
  const [draft, setDraft] = useState('')

  function add(value: string) {
    const cleaned = value.trim()
    if (!cleaned) return
    if (!values.some((item) => item.toLowerCase() === cleaned.toLowerCase())) {
      onChange([...values, cleaned])
    }
    setDraft('')
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      add(draft)
    } else if (event.key === 'Backspace' && !draft && values.length) {
      onChange(values.slice(0, -1))
    }
  }

  const listId = id ? `${id}-suggestions` : undefined

  return (
    <div className="rounded-[var(--radius-control)] border border-input bg-transparent px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30 dark:bg-input/30">
      {values.length ? (
        <div className="mb-1 flex flex-wrap gap-1">
          {values.map((value) => (
            <Badge key={value} variant="secondary" className="gap-1 pr-1 text-[11px]">
              {value}
              <button
                type="button"
                aria-label={`Remove ${value}`}
                onClick={() => onChange(values.filter((item) => item !== value))}
                className="rounded-full p-0.5 text-muted hover:text-ink"
              >
                <X className="size-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
      <input
        id={id}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        placeholder={placeholder}
        list={listId}
        className="h-6 w-full border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      {suggestions && listId ? (
        <datalist id={listId}>
          {suggestions.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      ) : null}
    </div>
  )
}
