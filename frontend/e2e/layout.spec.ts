import { test } from '@playwright/test'

import {
  expectCenteredHome,
  expectContainersAligned,
  expectNoClippedText,
  expectNoHorizontalScroll,
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
