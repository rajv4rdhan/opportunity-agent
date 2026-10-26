import { test } from '@playwright/test'

import {
  expectCanvasReadable,
  expectCenteredHome,
  expectContainersAligned,
  expectEdgesAttach,
  expectEqualRows,
  expectNoClippedText,
  expectNoHorizontalScroll,
  expectNoNodeOverlap,
  expectTapTargets,
  expectTextInsidePanels,
  mockApi,
} from './fixtures'

test.beforeEach(async ({ page }) => {
  await mockApi(page)
})

test('home layout invariants', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await expectNoHorizontalScroll(page)
  await expectContainersAligned(page)
  await expectCenteredHome(page)
  await expectNoClippedText(page)
  await expectTextInsidePanels(page)

  if ((page.viewportSize()?.width ?? 0) < 640) {
    await expectTapTargets(page)
  }
})


test('mid-run layout invariants', async ({ page }) => {
  await mockApi(page, { mid: true })
  await page.goto('/runs/fixture')
  await page.waitForTimeout(1400)

  await expectNoHorizontalScroll(page)
  await expectContainersAligned(page)
  await expectEqualRows(page)
  await expectNoClippedText(page)
  await expectTextInsidePanels(page)

  const width = page.viewportSize()?.width ?? 0
  if (width >= 1024) {
    await expectNoNodeOverlap(page)
    await expectEdgesAttach(page)
    await expectCanvasReadable(page)
  }
})
