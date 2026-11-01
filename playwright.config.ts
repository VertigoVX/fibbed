import { defineConfig, devices } from '@playwright/test'

// Mobile projects come first: the game is designed for phones, then desktop.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'small-android', use: { ...devices['Galaxy S9+'], viewport: { width: 360, height: 640 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
})
