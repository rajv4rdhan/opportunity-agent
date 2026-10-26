import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Monitor, Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'
import { applyTheme, cycleTheme, readStoredTheme, storeTheme, themeLabel, type ThemeMode } from '@/lib/theme'
import { Container } from './Container'
import { LogoMark } from './LogoMark'

/** Centre links jump to sections of the landing page. */
const SECTIONS = [
  { href: '/#how', label: 'How it works' },
  { href: '/#samples', label: 'Samples' },
  { href: '/#agents', label: 'Agents' },
  { href: '/#faq', label: 'FAQ' },
]

export function Header() {
  const location = useLocation()
  const [mode, setMode] = useState<ThemeMode>(() => readStoredTheme())
  const onHistory = location.pathname.startsWith('/runs')

  function toggleTheme() {
    const next = cycleTheme(mode)
    setMode(next)
    storeTheme(next)
    applyTheme(next)
  }

  const ThemeIcon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-line/70 bg-surface/90 backdrop-blur">
      <Container className="grid h-full grid-cols-[1fr_auto_1fr] items-center">
        <Link to="/" className="group flex w-fit items-center gap-2 text-ink" aria-label="ScholarSwarm home">
          <span className="flex size-8 items-center justify-center rounded-[10px] bg-accent text-on-accent transition-transform duration-300 group-hover:-rotate-12">
            <LogoMark className="size-[18px]" />
          </span>
          <span className="font-display text-[19px] font-semibold tracking-[-0.03em]">scholarswarm</span>
        </Link>

        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {SECTIONS.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="rounded-full px-3 py-1.5 text-[13px] text-muted transition-colors hover:bg-subtle hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label={`Theme: ${themeLabel(mode)}`}
                className="size-8 text-muted hover:bg-subtle hover:text-ink"
              >
                <ThemeIcon className="size-4" strokeWidth={1.75} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Theme: {themeLabel(mode)}</TooltipContent>
          </Tooltip>
          <Button
            asChild
            variant="outline"
            className={cn(
              'h-9 rounded-full border-accent/40 px-4 text-[13px] font-medium text-accent hover:bg-accent-soft hover:text-accent',
              onHistory && 'bg-accent-soft',
            )}
          >
            <Link to={onHistory ? '/' : '/runs'}>{onHistory ? 'New search' : 'History'}</Link>
          </Button>
        </div>
      </Container>
    </header>
  )
}
