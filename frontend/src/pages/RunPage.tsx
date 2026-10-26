import { useParams } from 'react-router'

import { Container } from '@/components/layout/Container'

export function RunPage() {
  const { id } = useParams()
  return (
    <Container>
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-card">
        <p className="text-sm text-muted">Run {id ?? 'unknown'} — live view loading.</p>
      </div>
    </Container>
  )
}
