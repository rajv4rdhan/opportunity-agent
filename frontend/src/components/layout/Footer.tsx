import { Link } from 'react-router'

import { Container } from './Container'
import { LogoMark } from './LogoMark'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'New search', to: '/' },
      { label: 'History', to: '/runs' },
      { label: 'How it works', to: '/#how' },
    ],
  },
  {
    title: 'Explore',
    links: [
      { label: 'Sample students', to: '/#samples' },
      { label: 'Meet the swarm', to: '/#agents' },
      { label: 'FAQ', to: '/#faq' },
    ],
  },
  {
    title: 'Trust',
    links: [
      { label: 'Official sources only', to: '/#faq' },
      { label: 'Every fact quoted', to: '/#faq' },
      { label: 'Your files', to: '/#faq' },
    ],
  },
]

/** Pastel wordmark: each letter its own colour, letters bob on hover. */
const LETTERS = [
  { char: 's', color: 'var(--ss-lilac)' },
  { char: 'w', color: 'var(--ss-peach)' },
  { char: 'a', color: 'var(--ss-pink)' },
  { char: 'r', color: 'var(--ss-sky)' },
  { char: 'm', color: 'var(--ss-mint)' },
]

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-surface pt-12">
      <Container>
        <div className="grid gap-10 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div>
            <Link to="/" className="flex items-center gap-2.5 text-ink">
              <span className="flex size-8 items-center justify-center rounded-[10px] bg-accent text-on-accent">
                <LogoMark className="size-[18px]" />
              </span>
              <span className="font-display text-lg font-semibold">scholarswarm</span>
            </Link>
            <p className="mt-3 max-w-[280px] text-sm leading-6 text-muted">
              An AI agent swarm that finds funding you actually qualify for — and shows its sources.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <p className="text-sm font-semibold text-ink">{column.title}</p>
                <ul className="mt-3 space-y-2">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link to={link.to} className="text-[13px] text-muted hover:text-accent">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Container>

      <div aria-hidden="true" className="mt-10 overflow-hidden">
        <p className="flex justify-center font-display text-[clamp(96px,24vw,340px)] leading-[0.8] font-bold tracking-[-0.05em] select-none">
          {LETTERS.map((letter, index) => (
            <span
              key={index}
              className="inline-block translate-y-[12%] transition-transform duration-500 hover:translate-y-0"
              style={{ color: letter.color }}
            >
              {letter.char}
            </span>
          ))}
        </p>
      </div>
    </footer>
  )
}
