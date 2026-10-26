import { Link } from 'react-router'

import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/button'
import { LogoMark } from '@/components/layout/LogoMark'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Page not found · ScholarSwarm')

  return (
    <Container>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <LogoMark className="size-10 text-accent" />
        <h1 className="mt-4 text-xl leading-7 font-semibold">Page not found</h1>
        <p className="mt-1 text-xs leading-[18px] text-muted">
          The page you are looking for does not exist.
        </p>
        <Button asChild className="mt-5 h-9 px-4">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </Container>
  )
}
