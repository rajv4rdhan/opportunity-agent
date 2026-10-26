import fs from 'node:fs'
import path from 'node:path'

import { expect, test } from '@playwright/test'

import { mockApi } from './fixtures'

const OUT = path.resolve(process.cwd(), '../docs/screenshots')
const PROJECTS = new Set(['desktop-1440', 'desktop-1440-dark', 'mobile-390'])

test.beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true })
})

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(!PROJECTS.has(testInfo.project.name), 'Curated screenshot projects only')
})

test('home', async ({ page }, testInfo) => {
  await mockApi(page)
  await page.goto('/')
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(OUT, `home-${testInfo.project.name}.png`), fullPage: true })
})

test('home-with-files', async ({ page }, testInfo) => {
  await mockApi(page)
  await page.goto('/')
  await page.locator('input[type=file]').setInputFiles(path.resolve('../backend/samples/rahul/resume.pdf'))
  await page.waitForTimeout(700)
  await page.screenshot({
    path: path.join(OUT, `home-with-files-${testInfo.project.name}.png`),
    fullPage: true,
  })
})

test('run-mid', async ({ page }, testInfo) => {
  await mockApi(page, { mid: true })
  await page.goto('/runs/fixture')
  await page.waitForTimeout(1500)
  await page.screenshot({
    path: path.join(OUT, `run-mid-${testInfo.project.name}.png`),
    fullPage: true,
  })
})

test('run-finished-matches', async ({ page }, testInfo) => {
  await mockApi(page)
  await page.goto('/runs/fixture')
  await expect(page.getByText(/We verified/)).toBeVisible({ timeout: 15_000 })
  await page.screenshot({
    path: path.join(OUT, `run-finished-matches-${testInfo.project.name}.png`),
    fullPage: true,
  })
})

test('run-finished-unlock', async ({ page }, testInfo) => {
  await mockApi(page)
  await page.goto('/runs/fixture')
  await expect(page.getByText(/We verified/)).toBeVisible({ timeout: 15_000 })
  await page.getByRole('tab', { name: /Unlock/ }).click()
  await page.waitForTimeout(300)
  await page.screenshot({
    path: path.join(OUT, `run-finished-unlock-${testInfo.project.name}.png`),
    fullPage: true,
  })
})

test('run-finished-sop', async ({ page }, testInfo) => {
  await mockApi(page)
  await page.goto('/runs/fixture')
  await expect(page.getByText(/We verified/)).toBeVisible({ timeout: 15_000 })
  await page.getByRole('tab', { name: 'SOP' }).click()
  await page.waitForTimeout(300)
  await page.screenshot({
    path: path.join(OUT, `run-finished-sop-${testInfo.project.name}.png`),
    fullPage: true,
  })
})

test('history', async ({ page }, testInfo) => {
  await mockApi(page)
  await page.goto('/runs')
  await page.waitForTimeout(500)
  await page.screenshot({
    path: path.join(OUT, `history-${testInfo.project.name}.png`),
    fullPage: true,
  })
})
