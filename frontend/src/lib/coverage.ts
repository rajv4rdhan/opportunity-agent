export const COUNTRIES = [
  'Australia',
  'Austria',
  'Belgium',
  'Canada',
  'China',
  'Denmark',
  'Finland',
  'France',
  'Germany',
  'Hong Kong',
  'India',
  'Ireland',
  'Italy',
  'Japan',
  'Netherlands',
  'New Zealand',
  'Norway',
  'Singapore',
  'South Korea',
  'Spain',
  'Sweden',
  'Switzerland',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'USA',
  'UK',
  'UAE',
]

export type CoverageHint =
  | 'degree'
  | 'grades'
  | 'goal'
  | 'countries'
  | 'budget'
  | 'tests'
  | 'projects'

const countryPattern = COUNTRIES.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')

const COVERAGE: Record<CoverageHint, RegExp[]> = {
  degree: [
    /\bb\.?\s?tech\b/i,
    /\bb\.?\s?sc\b/i,
    /\bb\.?\s?com\b/i,
    /\bbachelor(?:'s)?\b/i,
    /\bmaster(?:'s)?\b/i,
    /\bfinal[-\s]year\b/i,
    /\bgraduate\b/i,
    /\bcurrently\s+studying\b/i,
  ],
  grades: [
    /\b\d(?:\.\d{1,2})?\s*(?:cgpa|gpa)\b/i,
    /\b\d{2}(?:\.\d{1,2})?\s*%/,
    /\b\d(?:\.\d{1,2})?\s*\/\s*(?:4|10)(?:\.0)?\b/i,
    /\bpercentage\b/i,
  ],
  goal: [
    /\bms\b/i,
    /\bm\.?\s?sc\b/i,
    /\bmba\b/i,
    /\bph\.?\s?d\b/i,
    /\bmaster(?:'s)?\b/i,
    /\bpostgraduate\b/i,
    /\bstudy\b/i,
    /\bprogram(?:me)?\b/i,
  ],
  countries: [new RegExp(`\\b(?:${countryPattern})\\b`, 'i'), /\babroad\b/i, /\beurope\b/i],
  budget: [
    /\blakhs?\b/i,
    /₹/,
    /\binr\b/i,
    /\bbudget\b/i,
    /\bafford\b/i,
    /\bfully[-\s]funded\b/i,
    /\bfunding\b/i,
    /\bscholarship\b/i,
  ],
  tests: [
    /\bielts\b/i,
    /\btoefl\b/i,
    /\bgre\b/i,
    /\bgmat\b/i,
    /\bpte\b/i,
    /\bduolingo\b/i,
  ],
  projects: [/\bprojects?\b/i, /\bbuilt\b/i, /\bgithub(?:\.com)?\b/i],
}

export function coverage(text: string): Record<CoverageHint, boolean> {
  const value = text || ''
  return Object.fromEntries(
    Object.entries(COVERAGE).map(([hint, patterns]) => [
      hint,
      patterns.some((pattern) => pattern.test(value)),
    ]),
  ) as Record<CoverageHint, boolean>
}

export function wordCount(text: string | null | undefined): number {
  return (text ?? '').trim().split(/\s+/).filter(Boolean).length
}
