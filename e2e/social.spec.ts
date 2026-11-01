import { test, expect, type Page } from '@playwright/test'

// Paper No. 3 against a mocked Supabase with a spread of scores for the day.
const DAY = new Date(2026, 10, 4, 9, 0)
const FIBS = ['minerals they suck up', 'invented in Belgium', 'Mercury is the hottest']

async function mockSupabase(page: Page) {
  const otp: unknown[] = []
  await page.route('http://127.0.0.1:4174/**', (route) => {
    const req = route.request()
    const url = req.url()
    if (url.includes('/auth/v1/otp')) {
      otp.push(req.postDataJSON())
      return route.fulfill({ json: {} })
    }
    if (url.includes('/rpc/score_counts'))
      return route.fulfill({ json: [{ score: 0, players: 4 }, { score: 2, players: 6 }, { score: 5, players: 9 }, { score: 8, players: 5 }, { score: 12, players: 2 }] })
    if (url.includes('/rpc/puzzle_stats')) return route.fulfill({ json: [{ players: 26, perfect: 2, reader_fooled: 15 }] })
    if (req.method() === 'POST' && url.includes('/rpc/')) return route.fulfill({ json: [] })
    if (req.method() === 'POST') return route.fulfill({ status: 201, body: '' })
    return route.fulfill({ json: [] })
  })
  return otp
}

async function fibEveryRound(page: Page) {
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: new RegExp(FIBS[i]) }).click()
    await page.getByRole('button', { name: 'Mark as true' }).click()
    if (i < 2) await page.getByRole('button', { name: 'Next round' }).click()
  }
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(DAY)
})

test('the final paper compares you with today’s players', async ({ page }) => {
  await mockSupabase(page)
  await page.goto('/')
  await fibEveryRound(page)
  const compare = page.getByRole('region', { name: 'How you compare' })
  await expect(compare.getByText('You scored 0 of 12.')).toBeVisible()
  await expect(compare.getByText('Better than 0% of today’s 26 players.')).toBeVisible()
  await expect(compare.getByRole('img', { name: /scores of today’s players/ })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('share links and invite are within reach', async ({ page }) => {
  await mockSupabase(page)
  await page.goto('/')
  await fibEveryRound(page)
  const share = page.getByRole('region', { name: 'Share' })
  for (const name of ['X', 'WhatsApp', 'Bluesky', 'Facebook']) await expect(share.getByRole('link', { name })).toBeVisible()
  for (const name of ['Share result', 'Invite a friend']) {
    const box = (await share.getByRole('button', { name }).boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(44)
  }
})

test('signing in emails a link back to the game', async ({ page }) => {
  const otp = await mockSupabase(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Keep your streak on every device' })).toBeVisible()
  await page.getByLabel('Email').fill('sam@example.com')
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click()
  await expect(page.getByText(/Check your inbox at sam@example\.com/)).toBeVisible()
  expect(otp[0]).toMatchObject({ email: 'sam@example.com' })
  await page.getByRole('button', { name: 'Back to today’s paper' }).click()
  await expect(page.getByRole('list', { name: 'Statements' })).toBeVisible()
})
