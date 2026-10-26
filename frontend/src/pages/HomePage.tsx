import { Container } from '@/components/layout/Container'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

export function HomePage() {
  useDocumentTitle('ScholarSwarm')

  return (
    <Container>
      <div className="mx-auto max-w-[720px] py-16 text-center">
        <p className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-muted uppercase">
          Intake
        </p>
        <h1 className="mt-3 text-[44px] leading-[52px] font-semibold tracking-[-0.02em] max-sm:text-[32px] max-sm:leading-[40px]">
          Find funding you actually qualify for.
        </h1>
      </div>
    </Container>
  )
}
