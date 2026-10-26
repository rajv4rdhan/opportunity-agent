import { FileText, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface IntakeAttachment {
  id: string
  file: File
  role: 'resume' | 'transcript'
}

export function AttachmentChip({
  attachment,
  onRemove,
  onRoleChange,
}: {
  attachment: IntakeAttachment
  onRemove: () => void
  onRoleChange: (role: 'resume' | 'transcript') => void
}) {
  return (
    <span className="inline-flex h-8 items-center gap-1 rounded-full border border-line bg-subtle pr-1 pl-2 text-xs">
      <FileText className="size-3.5 text-muted" strokeWidth={1.75} />
      <span className="max-w-[180px] truncate">{attachment.file.name}</span>
      <Select
        value={attachment.role}
        onValueChange={(value) => onRoleChange(value as 'resume' | 'transcript')}
      >
        <SelectTrigger
          size="sm"
          aria-label="Document role"
          className="h-6 w-auto gap-0.5 border-0 bg-transparent px-1 text-[11px] text-muted shadow-none focus-visible:ring-0 dark:bg-transparent"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="resume">Resume</SelectItem>
          <SelectItem value="transcript">Transcript</SelectItem>
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        aria-label={`Remove ${attachment.file.name}`}
        className="rounded-full text-muted hover:bg-surface hover:text-ink"
      >
        <X className="size-3" />
      </Button>
    </span>
  )
}
