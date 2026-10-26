import { defineConfig, devices } from '@playwright/test'

const desktop = {
  viewport: { width: 1440, height: 900 },
  colorScheme: 'light' as const,
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-1440', use: desktop },
    {
      name: 'desktop-1280',
      use: { viewport: { width: 1280, height: 800 }, colorScheme: 'light' },
    },
    {
      name: 'laptop-1024',
      use: { viewport: { width: 1024, height: 768 }, colorScheme: 'light' },
    },
    {
      name: 'mobile-390',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, isMobile: true },
    },
    {
      name: 'desktop-1440-dark',
      use: { viewport: { width: 1440, height: 900 }, colorScheme: 'dark' },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
