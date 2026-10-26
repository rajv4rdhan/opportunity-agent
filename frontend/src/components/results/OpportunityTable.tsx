import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Search, ShieldCheck } from 'lucide-react'

import { DeadlineBadge } from '@/components/common/DeadlineBadge'
import { Panel } from '@/components/common/Panel'
import { StatusPill } from '@/components/common/StatusPill'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
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
          <ToggleGroupItem value="all" className="h-8 px-2.5 text-xs">
            All
          </ToggleGroupItem>
          <ToggleGroupItem value="eligible" className="h-8 px-2.5 text-xs">
            Eligible
          </ToggleGroupItem>
          <ToggleGroupItem value="partial" className="h-8 px-2.5 text-xs">
            Partial
          </ToggleGroupItem>
          <ToggleGroupItem value="not_eligible" className="h-8 px-2.5 text-xs">
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

      <div className="flex flex-col gap-2 xl:hidden">
        {rows.map((item) => (
          <div
            key={item.id || item.name}
            data-testid="panel"
            className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium break-words">{item.name}</p>
                <p className="text-xs break-words text-muted">{item.provider_org}</p>
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
              <StatusPill status={item.verification} />
            </div>
          </div>
        ))}
      </div>

      <Panel flush className="hidden overflow-hidden xl:block">
        <div className="overflow-x-auto">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[38%]">Opportunity</TableHead>
                <TableHead className="w-[11%]">Country</TableHead>
                <TableHead className="w-[10%]">Funding</TableHead>
                <TableHead className="w-[14%]">
                  <button
                    type="button"
                    onClick={() => toggleSort('deadline')}
                    className="inline-flex items-center gap-1"
                  >
                    Deadline {sortIcon('deadline')}
                  </button>
                </TableHead>
                <TableHead className="w-[14%]">Eligibility</TableHead>
                <TableHead className="w-[13%]">
                  <button
                    type="button"
                    onClick={() => toggleSort('score')}
                    className="inline-flex items-center gap-1"
                  >
                    Score {sortIcon('score')}
                  </button>
                </TableHead>

              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((item) => (
                <OpportunityRow key={item.id || item.name} opportunity={item} />
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted">
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
      <TableCell className="whitespace-normal">
        <div className="flex min-w-0 items-start gap-2">
          <span className="min-w-0">
            {opportunity.official_url ? (
              <a
                href={opportunity.official_url}
                target="_blank"
                rel="noreferrer"
                className="line-clamp-2 font-medium hover:text-accent hover:underline"
                title={opportunity.name}
              >
                {opportunity.name}
              </a>
            ) : (
              <span className="line-clamp-2 font-medium" title={opportunity.name}>
                {opportunity.name}
              </span>
            )}
            <span className="block truncate text-xs text-muted" title={opportunity.provider_org}>
              {opportunity.provider_org}
            </span>
          </span>
          {opportunity.verification === 'verified_official' ? (
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.75} aria-label="Official page" />
          ) : null}
        </div>
      </TableCell>
      <TableCell className="truncate text-sm" title={opportunity.country || ''}>{opportunity.country || '—'}</TableCell>
      <TableCell className="truncate text-sm capitalize">{fundingLabel(opportunity.funding_type)}</TableCell>
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
          <span className="h-1.5 w-10 overflow-hidden rounded-full bg-subtle">
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${Math.min(100, opportunity.score)}%` }}
            />
          </span>
        </div>
      </TableCell>
    </TableRow>
  )
}
