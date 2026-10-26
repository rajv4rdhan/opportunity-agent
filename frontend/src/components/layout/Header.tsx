import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Monitor, Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'
import { applyTheme, cycleTheme, readStoredTheme, storeTheme, themeLabel, type ThemeMode } from '@/lib/theme'
import { Container } from './Container'
import { LogoMark } from './LogoMark'

const NAV = [
  { href: '/', label: 'New search' },
  { href: '/runs', label: 'History' },
]

export function Header() {
  const location = useLocation()
  const [mode, setMode] = useState<ThemeMode>(() => readStoredTheme())

  function toggleTheme() {
    const next = cycleTheme(mode)
    setMode(next)
    storeTheme(next)
    applyTheme(next)
  }

  const ThemeIcon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-line bg-surface/90 backdrop-blur">
      <Container className="flex h-full items-center justify-between">
        <Link to="/" className="group flex items-center gap-2.5 text-ink" aria-label="ScholarSwarm home">
          <span className="flex size-8 items-center justify-center rounded-[8px] bg-accent text-on-accent transition-transform duration-300 group-hover:-rotate-6">
            <LogoMark className="size-[18px]" />
          </span>
          <span className="text-[16px] font-semibold tracking-[-0.02em]">ScholarSwarm</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active =
              item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href)
            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                className={cn(
                  'h-8 px-3 text-sm text-muted hover:bg-subtle hover:text-ink',
                  item.href === '/' && 'hidden sm:inline-flex',
                  active && 'bg-subtle text-ink',
                )}
              >
                <Link to={item.href}>{item.label}</Link>
              </Button>
            )
          })}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label={`Theme: ${themeLabel(mode)}`}
                className="ml-1 size-8 text-muted hover:bg-subtle hover:text-ink"
              >
                <ThemeIcon className="size-4" strokeWidth={1.75} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Theme: {themeLabel(mode)}</TooltipContent>
          </Tooltip>
        </nav>
      </Container>
    </header>
  )
}
