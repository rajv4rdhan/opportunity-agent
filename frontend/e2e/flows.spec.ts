import path from 'node:path'

import { expect, test } from '@playwright/test'

import { mockApi, mockCreateRun } from './fixtures'

const DESCRIPTION =
  'I am a final-year computer science student with an 8.2 CGPA and IELTS 7.5. I want a fully funded master in artificial intelligence in Germany or Canada.'

test.beforeEach(async ({ page }) => {
  await mockApi(page)
})

test('typing enables the composer and posts the description', async ({ page }) => {
  await mockCreateRun(page)
  await page.goto('/')

  const submit = page.getByRole('button', { name: 'Find scholarships' })
  await expect(submit).toBeDisabled()

  await page.getByLabel('About you').fill(DESCRIPTION)
  await expect(page.getByText(`${DESCRIPTION.split(' ').length} words`)).toBeVisible()
  await expect(page.locator('[data-testid=coverage-hint]').filter({ hasText: 'Degree' })).toHaveClass(
    /text-on-accent/,
  )
  await expect(submit).toBeEnabled()

  const [request] = await Promise.all([
    page.waitForRequest((item) => item.url().endsWith('/api/runs') && item.method() === 'POST'),
    submit.click(),
  ])
  expect(request.postData() ?? '').toContain('description')
  expect(request.postData() ?? '').toContain('final-year computer science')
  await page.waitForURL('**/runs/fixture')
})

test('attaching a PDF shows its detected role', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[type=file]').setInputFiles(
    path.resolve('../backend/samples/rahul/resume.pdf'),
  )

  await expect(page.getByText('resume.pdf')).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Document role' })).toContainText('Resume')
  await expect(page.getByRole('button', { name: 'Find scholarships' })).toBeEnabled()
})

test('a sample fills the composer', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Rahul' }).click()

  await expect(page.getByLabel('About you')).toHaveValue(/Sample profile: Rahul/)
  await expect(page.getByRole('button', { name: 'Find scholarships' })).toBeEnabled()
})

test('the advanced sheet opens and chaos switches toggle', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Advanced' }).click()

  await expect(page.getByRole('heading', { name: 'Advanced options' })).toBeVisible()
  await page.getByRole('tab', { name: 'Demo' }).click()
  const chaos = page.getByRole('switch').first()
  await expect(chaos).toHaveAttribute('aria-checked', 'false')
  await chaos.click()
  await expect(chaos).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('heading', { name: 'Advanced options' })).toBeHidden()
})


test('a mid-run page shows the swarm and verifier pool', async ({ page }) => {
  await mockApi(page, { mid: true })
  await page.goto('/runs/fixture')
  await page.waitForTimeout(1200)

  const width = page.viewportSize()?.width ?? 0
  if (width >= 1024) {
    await expect(page.locator('[data-testid=agent-node][data-status=done]').first()).toBeVisible()
    expect(await page.locator('[data-testid=agent-node][data-status=done]').count()).toBeGreaterThanOrEqual(3)
    expect(await page.locator('[data-testid=verifier-pool] .animate-spin').count()).toBeGreaterThanOrEqual(1)
    expect(await page.locator('[data-testid=verifier-pool] .grid span').count()).toBeGreaterThanOrEqual(1)
  } else {
    await expect(page.getByText('Agent swarm')).toBeVisible()
  }
})


test('a finished run shows the summary, matches and requirements', async ({ page }) => {
  await page.goto('/runs/fixture')
  await expect(page.getByText(/We verified/)).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-testid=match-card]')).toHaveCount(5)
  await expect(page.getByRole('link', { name: 'Matches' })).toBeVisible()

  await page.getByRole('button', { name: /Requirements \(/ }).first().click()
  await expect(page.getByText(/full-time research-stream/i).first()).toBeVisible()
})

test('unlock more recalculates and shows newly eligible matches', async ({ page }) => {
  await page.route('**/api/runs/fixture/whatif', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        opportunities: [
          { id: 'new-1', name: 'New Scholarship', eligibility: 'eligible', score: 92 },
        ],
        gaps: [],
      }),
    })
  })

  await page.goto('/runs/fixture')
  await expect(page.getByText(/We verified/)).toBeVisible({ timeout: 15_000 })
  await page.getByRole('link', { name: 'Unlock more' }).click()
  await page.getByRole('button', { name: 'Recalculate' }).click()
  await expect(page.getByText('New Scholarship')).toBeVisible()
  await expect(page.getByText('Newly eligible')).toBeVisible()
})

test('replay at 20x reaches the results', async ({ page }) => {
  await mockApi(page, { fastReplay: true })
  await page.goto('/runs/fixture?replay=1&speed=20')
  await expect(page.getByText(/Replay/).first()).toBeVisible()
  await expect(page.getByText(/We verified/)).toBeVisible({ timeout: 20_000 })
})


test('history row click opens the run', async ({ page }) => {
  await page.goto('/runs')
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible()
  await page.getByTestId('history-card').filter({ hasText: 'fixture' }).click()
  await page.waitForURL('**/runs/fixture')
  await expect(page.getByText(/We verified/)).toBeVisible({ timeout: 15_000 })
})


test('the 404 page offers a way home', async ({ page }) => {
  await page.goto('/does-not-exist')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await page.getByRole('link', { name: 'Go home' }).click()
  await page.waitForURL('**/')
})


test('Ctrl+Enter submits the composer', async ({ page }) => {
  await mockCreateRun(page)
  await page.goto('/')
  await page.getByLabel('About you').fill(DESCRIPTION)
  await expect(page.getByRole('button', { name: 'Find scholarships' })).toBeEnabled()

  const [request] = await Promise.all([
    page.waitForRequest((item) => item.url().endsWith('/api/runs') && item.method() === 'POST'),
    page.getByLabel('About you').press('Control+Enter'),
  ])
  expect(request.postData() ?? '').toContain('final-year computer science')
  await page.waitForURL('**/runs/fixture')
})

test('Escape closes the advanced sheet', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Advanced' }).click()
  await expect(page.getByRole('heading', { name: 'Advanced options' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'Advanced options' })).toBeHidden()
})


test('a failed run explains what happened and offers a replay', async ({ page }) => {
  await mockApi(page, { failed: true })
  await page.goto('/runs/fixture')
  await expect(page.getByRole('heading', { name: 'This run stopped' })).toBeVisible()
  await expect(
    page.getByTestId('failed-panel').getByText(/browser session was interrupted/),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Replay what happened' })).toBeVisible()
})
