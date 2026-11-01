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
    // A Supabase address nothing listens on: the game falls back to offline at once,
    // and the editor tests mock it with page.route.
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    env: { VITE_SUPABASE_URL: 'http://127.0.0.1:4174', VITE_SUPABASE_ANON_KEY: 'test-key' },
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'small-android', use: { ...devices['Galaxy S9+'], viewport: { width: 360, height: 640 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
})
