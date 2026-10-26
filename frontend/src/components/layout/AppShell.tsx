import { useEffect, type ReactNode } from 'react'

import { applyTheme, readStoredTheme } from '@/lib/theme'
import { Header } from './Header'

export function AppShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme(readStoredTheme())
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return (
    <div className="min-h-dvh bg-canvas font-sans text-ink">
      <Header />
      <main className="py-8 sm:py-10">{children}</main>
    </div>
  )
}
