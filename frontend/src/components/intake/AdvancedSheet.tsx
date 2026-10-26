import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ChipsInput } from '@/components/common/ChipsInput'
import type { MetaResponse } from '@/api/types'
import { COUNTRIES } from '@/lib/coverage'

export interface AdvancedValues {
  github_url: string
  linkedin_url: string
  other_links: string
  target_countries: string[]
  target_degree: string
  budget_inr_per_year: number | null
  nationality: string
  ielts: number | null
  toefl: number | null
  gre: number | null
  notes: string
  chaos: Record<string, boolean>
}

export const EMPTY_ADVANCED: AdvancedValues = {
  github_url: '',
  linkedin_url: '',
  other_links: '',
  target_countries: [],
  target_degree: '',
  budget_inr_per_year: null,
  nationality: '',
  ielts: null,
  toefl: null,
  gre: null,
  notes: '',
  chaos: {},
}

const DEGREES = ['MS', 'MEng', 'MBA', 'PhD', 'MA', 'Other']

function numberValue(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function AdvancedSheet({
  open,
  onOpenChange,
  values,
  onChange,
  meta,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  values: AdvancedValues
  onChange: (values: AdvancedValues) => void
  meta: MetaResponse | undefined
}) {
  function patch(partial: Partial<AdvancedValues>) {
    onChange({ ...values, ...partial })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="!w-[440px] sm:!max-w-[440px]">
        <SheetHeader>
          <SheetTitle>Advanced options</SheetTitle>
          <SheetDescription>
            Optional details improve matching. Demo controls inject one visible failure per run.
          </SheetDescription>
        </SheetHeader>
        <Tabs defaultValue="details" className="min-h-0 flex-1 gap-3 px-4">
          <TabsList className="w-full">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="demo">Demo</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="min-h-0 flex-1">
            <ScrollArea className="h-full pr-2">
              <div className="grid grid-cols-2 gap-4 pb-4">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="github">GitHub URL</Label>
                  <Input
                    id="github"
                    placeholder="https://github.com/username"
                    value={values.github_url}
                    onChange={(event) => patch({ github_url: event.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="linkedin">LinkedIn or portfolio</Label>
                  <Input
                    id="linkedin"
                    value={values.linkedin_url}
                    onChange={(event) => patch({ linkedin_url: event.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Target countries</Label>
                  <ChipsInput
                    values={values.target_countries}
                    onChange={(target_countries) => patch({ target_countries })}
                    placeholder="Type a country and press Enter"
                    suggestions={COUNTRIES}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Degree</Label>
                  <Select
                    value={values.target_degree || undefined}
                    onValueChange={(target_degree) => patch({ target_degree })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Any degree" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEGREES.map((degree) => (
                        <SelectItem key={degree} value={degree}>
                          {degree}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="budget">Budget INR/yr</Label>
                  <Input
                    id="budget"
                    type="number"
                    min={0}
                    step={100000}
                    value={values.budget_inr_per_year ?? ''}
                    onChange={(event) =>
                      patch({ budget_inr_per_year: numberValue(event.target.value) })
                    }
                  />
                </div>
                <div className="col-span-2 grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ielts">IELTS</Label>
                    <Input
                      id="ielts"
                      type="number"
                      min={0}
                      max={9}
                      step={0.5}
                      value={values.ielts ?? ''}
                      onChange={(event) => patch({ ielts: numberValue(event.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="toefl">TOEFL</Label>
                    <Input
                      id="toefl"
                      type="number"
                      min={0}
                      max={120}
                      step={1}
                      value={values.toefl ?? ''}
                      onChange={(event) => patch({ toefl: numberValue(event.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gre">GRE</Label>
                    <Input
                      id="gre"
                      type="number"
                      min={0}
                      max={340}
                      step={1}
                      value={values.gre ?? ''}
                      onChange={(event) => patch({ gre: numberValue(event.target.value) })}
                    />
                  </div>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input
                    id="nationality"
                    value={values.nationality}
                    onChange={(event) => patch({ nationality: event.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    placeholder="Constraints or preferences"
                    value={values.notes}
                    onChange={(event) => patch({ notes: event.target.value })}
                  />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="demo" className="min-h-0 flex-1">
            <ScrollArea className="h-full pr-2">
              <p className="text-sm font-medium">Chaos Mode</p>
              <p className="mt-0.5 text-xs leading-[18px] text-muted">
                Inject a failure once per run and watch the agents recover.
              </p>
              <div className="mt-2">
                {(meta?.chaos_points ?? []).map((point) => (
                  <div
                    key={point.key}
                    className="flex items-start justify-between gap-4 border-b border-line py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{point.label}</p>
                      <p className="text-xs leading-[18px] text-muted">{point.caption}</p>
                    </div>
                    <Switch
                      aria-label={point.label}
                      checked={Boolean(values.chaos[point.key])}
                      onCheckedChange={(checked) =>
                        patch({ chaos: { ...values.chaos, [point.key]: checked } })
                      }
                    />
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm font-medium">Providers</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {Object.entries(meta?.providers ?? {}).map(([name, ready]) => (
                  <span
                    key={name}
                    className={
                      ready
                        ? 'inline-flex h-6 items-center gap-1.5 rounded-full border border-ok/30 bg-ok-soft px-2 text-xs font-medium text-ok'
                        : 'inline-flex h-6 items-center gap-1.5 rounded-full border border-line bg-subtle px-2 text-xs font-medium text-muted'
                    }
                  >
                    <span className="size-1.5 rounded-full bg-current" />
                    {name} {ready ? 'ready' : 'not set'}
                  </span>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        <SheetFooter>
          <Button type="button" className="h-9" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
