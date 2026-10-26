import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, Search } from 'lucide-react'

import { DeadlineBadge } from '@/components/common/DeadlineBadge'
import { Panel } from '@/components/common/Panel'
import { StatusPill } from '@/components/common/StatusPill'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatDate } from '@/lib/format'
import type { FinalReport, Opportunity } from '@/api/types'

type Filter = 'all' | 'eligible' | 'partial' | 'not_eligible'
type SortKey = 'score' | 'deadline'

function fundingLabel(value: string): string {
  return value.replaceAll('_', ' ')
}

export function OpportunityTable({ report }: { report: FinalReport }) {
  const opportunities = report.all_opportunities ?? []
  const [filter, setFilter] = useState<Filter>('all')
  const [country, setCountry] = useState('All countries')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'score',
    direction: 'desc',
  })

  const countries = useMemo(
    () =>
      [...new Set(opportunities.map((item) => item.country).filter(Boolean) as string[])].sort(),
    [opportunities],
  )

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = opportunities.filter((item) => {
      if (filter !== 'all' && item.eligibility !== filter) return false
      if (country !== 'All countries' && item.country !== country) return false
      if (!needle) return true
      return `${item.name} ${item.provider_org} ${item.country ?? ''}`
        .toLowerCase()
        .includes(needle)
    })
    return [...filtered].sort((first, second) => {
      if (sort.key === 'score') {
        return sort.direction === 'desc' ? second.score - first.score : first.score - second.score
      }
      const a = first.deadline ? Date.parse(first.deadline) : Number.POSITIVE_INFINITY
      const b = second.deadline ? Date.parse(second.deadline) : Number.POSITIVE_INFINITY
      return sort.direction === 'asc' ? a - b : b - a
    })
  }, [opportunities, filter, country, query, sort])

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'desc' ? 'asc' : 'desc' }
        : { key, direction: key === 'score' ? 'desc' : 'asc' },
    )
  }

  function sortIcon(key: SortKey) {
    if (sort.key !== key) return <ArrowUpDown className="size-3" strokeWidth={1.75} />
    return sort.direction === 'desc' ? (
      <ArrowDown className="size-3" strokeWidth={1.75} />
    ) : (
      <ArrowUp className="size-3" strokeWidth={1.75} />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(value) => {
            if (value) setFilter(value as Filter)
          }}
          className="h-8"
        >
          <ToggleGroupItem value="all" className="h-7 px-2 text-xs">
            All
          </ToggleGroupItem>
          <ToggleGroupItem value="eligible" className="h-7 px-2 text-xs">
            Eligible
          </ToggleGroupItem>
          <ToggleGroupItem value="partial" className="h-7 px-2 text-xs">
            Partial
          </ToggleGroupItem>
          <ToggleGroupItem value="not_eligible" className="h-7 px-2 text-xs">
            Not eligible
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="h-8 w-44 text-xs" aria-label="Filter by country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All countries">All countries</SelectItem>
              {countries.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute top-2 left-2.5 size-4 text-muted" strokeWidth={1.75} />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search opportunities"
              aria-label="Search opportunities"
              className="h-8 w-[220px] pl-8 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:hidden">
        {rows.map((item) => (
          <div
            key={item.id || item.name}
            className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted">{item.provider_org}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {Math.round(item.score)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">{item.country || '—'}</span>
              <span className="text-xs text-muted capitalize">
                {fundingLabel(item.funding_type)}
              </span>
              <DeadlineBadge deadline={item.deadline} />
              <StatusPill status={item.eligibility} />
            </div>
          </div>
        ))}
      </div>

      <Panel flush className="hidden overflow-hidden sm:block">
        <div className="overflow-x-auto">
          <Table className="min-w-[880px]">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[260px]">Opportunity</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Funding</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => toggleSort('deadline')}
                    className="inline-flex items-center gap-1"
                  >
                    Deadline {sortIcon('deadline')}
                  </button>
                </TableHead>
                <TableHead>Eligibility</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => toggleSort('score')}
                    className="inline-flex items-center gap-1"
                  >
                    Score {sortIcon('score')}
                  </button>
                </TableHead>
                <TableHead>Verification</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((item) => (
                <OpportunityRow key={item.id || item.name} opportunity={item} />
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm text-muted">
                    No opportunities match these filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
        <p className="border-t border-line px-4 py-2 text-xs text-muted">
          {rows.length} of {opportunities.length} opportunities
        </p>
      </Panel>

      {report.rejected?.length ? (
        <Accordion type="single" collapsible>
          <AccordionItem value="rejected">
            <AccordionTrigger className="text-sm">
              Rejected ({report.rejected.length})
            </AccordionTrigger>
            <AccordionContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rejected.map((rejection, index) => (
                    <TableRow key={`${rejection.url}-${index}`}>
                      <TableCell className="max-w-[320px] truncate text-xs">{rejection.url}</TableCell>
                      <TableCell className="text-xs">{rejection.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}
    </div>
  )
}

function OpportunityRow({ opportunity }: { opportunity: Opportunity }) {
  return (
    <TableRow>
      <TableCell>
        <p className="font-medium">{opportunity.name}</p>
        <p className="text-xs text-muted">{opportunity.provider_org}</p>
      </TableCell>
      <TableCell className="text-sm">{opportunity.country || '—'}</TableCell>
      <TableCell className="text-sm capitalize">{fundingLabel(opportunity.funding_type)}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span className="text-sm tabular-nums">{formatDate(opportunity.deadline, 'd MMM yyyy')}</span>
          <DeadlineBadge deadline={opportunity.deadline} />
        </div>
      </TableCell>
      <TableCell>
        <StatusPill status={opportunity.eligibility} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="text-sm tabular-nums">{Math.round(opportunity.score)}</span>
          <span className="h-1.5 w-12 overflow-hidden rounded-full bg-subtle">
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${Math.min(100, opportunity.score)}%` }}
            />
          </span>
        </div>
      </TableCell>
      <TableCell>
        <StatusPill status={opportunity.verification} />
      </TableCell>
      <TableCell>
        {opportunity.official_url ? (
          <Button asChild variant="ghost" size="icon-sm" aria-label="Open official page">
            <a href={opportunity.official_url} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" strokeWidth={1.75} />
            </a>
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  )
}
