import { useState } from 'react'
import { Globe } from 'lucide-react'

import { cn } from '@/lib/cn'

export function Favicon({ domain, className }: { domain: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (!domain || failed) {
    return <Globe className={cn('size-4 text-muted', className)} strokeWidth={1.75} />
  }
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('size-4 rounded-sm', className)}
    />
  )
}
