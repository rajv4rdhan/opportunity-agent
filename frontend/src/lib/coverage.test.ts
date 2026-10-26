import { describe, expect, it } from 'vitest'

import { coverage, wordCount } from './coverage'

describe('coverage', () => {
  it('detects every key fact', () => {
    const text =
      "Final-year B.Tech student. I have 8.2 CGPA and IELTS 7.5. I want a fully funded master's in AI in Germany or Canada. My budget is low. I built two projects, see github.com/example."
    expect(coverage(text)).toEqual({
      degree: true,
      grades: true,
      goal: true,
      countries: true,
      budget: true,
      tests: true,
      projects: true,
    })
  })

  it('reports missing facts', () => {
    expect(coverage('I am a student who likes programming.')).toEqual({
      degree: false,
      grades: false,
      goal: false,
      countries: false,
      budget: false,
      tests: false,
      projects: false,
    })
  })

  it('does not treat spoken numbers as written grades', () => {
    expect(coverage('I have eight point two CGPA').grades).toBe(false)
  })

  it('counts words like the intake rule', () => {
    expect(wordCount('  one\ttwo   three\n')).toBe(3)
    expect(wordCount(null)).toBe(0)
  })
})
