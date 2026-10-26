import { expect, type Page } from '@playwright/test'

import graph from './fixtures/graph.json' with { type: 'json' }
import eventsFull from './fixtures/events-full.json' with { type: 'json' }
import eventsMid from './fixtures/events-mid.json' with { type: 'json' }
import meta from './fixtures/meta.json' with { type: 'json' }
import runFailed from './fixtures/run-failed.json' with { type: 'json' }
import runFinished from './fixtures/run-finished.json' with { type: 'json' }
import runMid from './fixtures/run-mid.json' with { type: 'json' }
import runs from './fixtures/runs.json' with { type: 'json' }

function recentEvents(events: typeof eventsFull): typeof eventsFull {
  if (events.length === 0) return events
  const offset = Date.now() - Date.parse(events[events.length - 1].ts)
  return events.map((event) => ({
    ...event,
    ts: new Date(Date.parse(event.ts) + offset).toISOString(),
  }))
}

export const FIXTURES = {
  graph,
  eventsFull,
  eventsMid,
  meta,
  runFinished,
  runMid,
  runs,
}

export interface MockOptions {
  mid?: boolean
  failed?: boolean
  fastReplay?: boolean
}

function failedEvents(): typeof eventsFull {
  const events = recentEvents(eventsMid)
  const last = events[events.length - 1]
  return [
    ...events,
    {
      id: (last?.id ?? 0) + 1,
      run_id: 'fixture',
      ts: new Date().toISOString(),
      type: 'run_failed',
      agent: null,
      message: 'The browser session was interrupted before the run finished.',
      data: {},
    },
  ] as typeof eventsFull
}

function compressedEvents(events: typeof eventsFull): typeof eventsFull {
  const span = 40_000
  const step = events.length > 1 ? span / (events.length - 1) : 0
  const end = Date.now()
  return events.map((event, index) => ({
    ...event,
    ts: new Date(end - span + index * step).toISOString(),
  }))
}

export async function mockApi(page: Page, options: MockOptions = {}): Promise<void> {
  await page.route('https://www.google.com/**', (route) => route.abort())
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (data: unknown) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data),
      })

    if (path === '/api/meta') return json(meta)
    if (path === '/api/runs' && request.method() === 'POST') return json({ run_id: 'fixture' })
    if (path === '/api/runs') return json(runs)
    if (path === '/api/runs/fixture/events.json') {
      if (options.fastReplay) return json(compressedEvents(eventsFull))
      if (options.failed) return json(failedEvents())
      return json(recentEvents(options.mid ? eventsMid : eventsFull))
    }
    if (path === '/api/runs/fixture/events') {
      const events = options.failed
        ? failedEvents()
        : recentEvents(options.mid ? eventsMid : eventsFull)
      const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('')
      return route.fulfill({
        status: 200,
        headers: {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
        },
        body,
      })
    }
    if (path === '/api/runs/fixture/graph') return json(graph)
    if (path === '/api/runs/fixture') {
      if (options.mid) return json(runMid)
      if (options.failed) return json(runFailed)
      return json(runFinished)
    }
    if (path.startsWith('/api/runs/fixture/whatif')) {
      const report = runFinished.report
      return json({
        opportunities: report?.all_opportunities ?? [],
        gaps: [],
      })
    }
    if (path.startsWith('/api/runs/fixture/resume')) return json({ ok: true })
    if (path.endsWith('/report.md') || path.endsWith('/sop.md') || path.endsWith('/deadlines.ics')) {
      return route.fulfill({ status: 200, body: 'fixture' })
    }
    return json({ detail: 'Not found' })
  })
}

export async function mockCreateRun(page: Page): Promise<void> {
  await page.route('**/api/runs', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ run_id: 'fixture' }),
    })
  })
}

export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const values = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(values.scrollWidth, 'page has horizontal scroll').toBeLessThanOrEqual(values.innerWidth)
}

export async function expectContainersAligned(page: Page): Promise<void> {
  const boxes = await page.locator('[data-testid=container]').evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect()
      return { left: rect.left, width: rect.width }
    }),
  )
  expect(boxes.length, 'expected at least one container').toBeGreaterThan(0)
  const first = boxes[0]
  for (const box of boxes) {
    expect(Math.abs(box.left - first.left), 'containers must share a left edge').toBeLessThanOrEqual(1)
    expect(Math.abs(box.width - first.width), 'containers must share a width').toBeLessThanOrEqual(1)
  }
}

export async function expectCenteredHome(page: Page): Promise<void> {
  const composer = await page.locator('[data-testid=composer]').boundingBox()
  const viewport = page.viewportSize()
  expect(composer, 'composer must be visible').not.toBeNull()
  if (!composer || !viewport) return
  const center = composer.x + composer.width / 2
  expect(Math.abs(center - viewport.width / 2), 'composer must be centered').toBeLessThanOrEqual(2)
  const align = await page.locator('h1').evaluate((element) => getComputedStyle(element).textAlign)
  expect(align).toBe('center')
}

export async function expectEqualRows(page: Page): Promise<void> {
  const rows = await page.locator('[data-row]').evaluateAll((elements) =>
    elements.map((row) => {
      const children = Array.from(row.children).map((child) => {
        const rect = child.getBoundingClientRect()
        return { height: rect.height, width: rect.width }
      })
      return { name: row.getAttribute('data-row'), children }
    }),
  )
  for (const row of rows) {
    if (row.children.length < 2) continue
    const first = row.children[0]
    for (const child of row.children) {
      expect(Math.abs(child.height - first.height), `${row.name}: equal heights`).toBeLessThanOrEqual(1)
      expect(Math.abs(child.width - first.width), `${row.name}: equal widths`).toBeLessThanOrEqual(1)
    }
  }
}

export async function expectNoNodeOverlap(page: Page): Promise<void> {
  const boxes = await page.locator('.react-flow__node').evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect()
      return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, id: element.getAttribute('data-id') }
    }),
  )
  for (let first = 0; first < boxes.length; first += 1) {
    for (let second = first + 1; second < boxes.length; second += 1) {
      const a = boxes[first]
      const b = boxes[second]
      const overlap =
        a.x < b.right - 1 && b.x < a.right - 1 && a.y < b.bottom - 1 && b.y < a.bottom - 1
      expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false)
    }
  }
}

export async function expectEdgesAttach(page: Page): Promise<void> {
  const result = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('.react-flow__node')).map((element) => {
      const rect = element.getBoundingClientRect()
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
    })
    const near = (x: number, y: number) =>
      nodes.some(
        (box) =>
          x >= box.left - 4 && x <= box.right + 4 && y >= box.top - 4 && y <= box.bottom + 4,
      )
    const failures: string[] = []
    for (const path of Array.from(document.querySelectorAll('.react-flow__edge path'))) {
      const element = path as SVGPathElement
      if (!element.getTotalLength) continue
      const matrix = element.getScreenCTM()
      if (!matrix) continue
      for (const point of [0, element.getTotalLength()]) {
        const local = element.getPointAtLength(point)
        const screen = new DOMPoint(local.x, local.y).matrixTransform(matrix)
        if (!near(screen.x, screen.y)) failures.push(`${element.id || 'edge'}:${point}`)
      }
    }
    return failures
  })
  expect(result, `edges not attached: ${result.join(', ')}`).toEqual([])
}

export async function expectNoClippedText(page: Page): Promise<void> {
  const clipped = await page.evaluate(() => {
    const selector = '[data-testid=node-name], h1, h2, h3, button, [data-testid=kpi-value]'
    const failures: string[] = []
    for (const element of Array.from(document.querySelectorAll(selector))) {
      const html = element as HTMLElement
      if (!html.offsetParent && html.getClientRects().length === 0) continue
      if (html.scrollWidth <= html.clientWidth + 1) continue
      const truncated =
        html.className.includes('truncate') && Boolean(html.getAttribute('title'))
      if (!truncated) failures.push((html.textContent ?? '').trim().slice(0, 60))
    }
    return failures
  })
  expect(clipped, `clipped text: ${clipped.join(' | ')}`).toEqual([])
}

export async function expectTextInsidePanels(page: Page): Promise<void> {
  const failures = await page.evaluate(() => {
    const bad: string[] = []
    for (const panel of Array.from(document.querySelectorAll('[data-testid=panel],[data-testid=match-card]'))) {
      const panelRect = panel.getBoundingClientRect()
      for (const element of Array.from(panel.querySelectorAll('p, span, a, h1, h2, h3, td, th'))) {
        const rect = element.getBoundingClientRect()
        if (rect.width === 0) continue
        if (rect.right > panelRect.right + 1) {
          bad.push((element.textContent ?? '').trim().slice(0, 40))
        }
      }
    }
    return bad
  })
  expect(failures, `text outside panels: ${failures.join(' | ')}`).toEqual([])
}

export async function expectCanvasReadable(page: Page): Promise<number> {
  const zoom = await page.evaluate(() => {
    const viewport = document.querySelector('.react-flow__viewport')
    if (!viewport) return null
    const transform = getComputedStyle(viewport).transform
    if (!transform || transform === 'none') return 1
    return Number(new DOMMatrixReadOnly(transform).a)
  })
  expect(zoom, 'React Flow viewport missing').not.toBeNull()
  const width = page.viewportSize()?.width ?? 0
  const minimum = width >= 1280 ? 0.8 : 0.7
  expect(zoom ?? 0, `canvas zoom ${zoom} below ${minimum}`).toBeGreaterThanOrEqual(minimum)
  return zoom ?? 0
}

export async function expectTapTargets(page: Page): Promise<void> {
  const small = await page.locator('button').evaluateAll((elements) =>
    elements
      .filter((element) => {
        const html = element as HTMLElement
        if (!html.offsetParent && html.getClientRects().length === 0) return false
        return html.getBoundingClientRect().height < 32
      })
      .map((element) => (element.textContent ?? element.getAttribute('aria-label') ?? '').trim()),
  )
  expect(small, `tap targets below 32px: ${small.join(' | ')}`).toEqual([])
}
