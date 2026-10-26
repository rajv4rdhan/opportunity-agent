import { Container } from '@/components/layout/Container'
import { PageHeader } from '@/components/layout/PageHeader'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

export function HistoryPage() {
  useDocumentTitle('History · ScholarSwarm')

  return (
    <Container>
      <PageHeader title="History" subtitle="Every search you ran, with a replay." />
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-card">
        <p className="text-sm text-muted">No searches yet.</p>
      </div>
    </Container>
  )
}
