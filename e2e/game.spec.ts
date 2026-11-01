import { test, expect, type Page } from '@playwright/test'

// Paper No. 3 (4 November 2026): Trees, Chocolate, The Solar System.
const DAY = new Date(2026, 10, 4, 9, 0)
const ROUNDS = [
  { theme: 'Trees', truths: ['tree’s age', 'chlorophyll', 'coast redwood'], fib: 'minerals they suck up' },
  { theme: 'Chocolate', truths: ['seeds of the cacao', 'no cocoa solids', 'theobromine'], fib: 'invented in Belgium' },
  { theme: 'The Solar System', truths: ['single day on Venus', 'Neptune was predicted', 'Saturn is less dense'], fib: 'Mercury is the hottest' },
]

test.beforeEach(async ({ page }) => {
  // A quiet Supabase: no reader fib, no stats yet, and every insert accepted.
  await page.route('http://127.0.0.1:4174/**', (route) => {
    const req = route.request()
    if (req.method() === 'POST' && req.url().includes('/rpc/')) return route.fulfill({ json: [] })
    if (req.method() === 'POST') return route.fulfill({ status: 201, body: '' })
    return route.fulfill({ json: [] })
  })
  await page.clock.setFixedTime(DAY)
  await page.goto('/')
  await expect(page.getByRole('list', { name: 'Statements' })).toBeVisible()
})

async function markTrue(page: Page, text: string) {
  await page.getByRole('button', { name: new RegExp(text) }).click()
  await page.getByRole('button', { name: 'Mark as true' }).click()
}

async function playRound(page: Page, i: number, how: 'catch' | 'fooled') {
  if (how === 'catch') for (const t of ROUNDS[i].truths) await markTrue(page, t)
  else await markTrue(page, ROUNDS[i].fib)
  if (i < 2) {
    await expect(page.getByRole('heading', { name: how === 'catch' ? 'Caught it.' : 'Fibbed.' })).toBeVisible()
    await page.getByRole('button', { name: 'Next round' }).click()
    await expect(page.getByRole('heading', { level: 1, name: new RegExp(`Round ${i + 2} of 3`) })).toBeVisible()
  }
}

async function noSideScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

test('opens on round 1 without sideways scrolling', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1, name: /Round 1 of 3.*Trees/ })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Statements' }).getByRole('button')).toHaveCount(4)
  await noSideScroll(page)
})

test('keeps the main button in thumb reach and everything big enough to tap', async ({ page }) => {
  const button = page.getByRole('button', { name: 'Mark as true' })
  await expect(button).toBeInViewport()
  expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  for (const s of await page.getByRole('list', { name: 'Statements' }).getByRole('button').all()) {
    expect((await s.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  }
})

test('the action bar never hides the last statement', async ({ page }) => {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  const last = page.getByRole('list', { name: 'Statements' }).getByRole('button').last()
  const bar = (await page.locator('.actionbar').boundingBox())!
  const lastBox = (await last.boundingBox())!
  expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(bar.y)
})

test('a full day: three rounds to the final paper', async ({ page }) => {
  await playRound(page, 0, 'catch')
  await noSideScroll(page)
  await playRound(page, 1, 'fooled')
  await playRound(page, 2, 'catch')
  await expect(page.getByRole('heading', { level: 1, name: 'You caught 2 of 3 fibs.' })).toBeFocused()
  for (const r of ROUNDS) await expect(page.getByRole('region', { name: `Correction: ${r.theme}` })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Your record' })).toContainText('1Played')
  await noSideScroll(page)

  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'You caught 2 of 3 fibs.' })).toBeVisible()
})

test('a perfect paper', async ({ page }) => {
  for (let i = 0; i < 3; i++) await playRound(page, i, 'catch')
  await expect(page.getByRole('heading', { level: 1, name: 'A perfect paper.' })).toBeVisible()
})

test('writing tomorrow’s round 3 fib', async ({ page }) => {
  for (let i = 0; i < 3; i++) await playRound(page, i, 'fooled')
  await expect(page.getByRole('heading', { name: 'Tomorrow’s round 3: The human body' })).toBeVisible()
  await page.getByLabel('Your fib').fill('Your little toe has no bones in it at all.')
  await page.getByRole('button', { name: 'Send fib' }).click()
  await expect(page.getByText('“Your little toe has no bones in it at all.”')).toBeVisible()
  await expect(page.getByText(/Filed\. If the editor picks it/)).toBeVisible()
  await noSideScroll(page)
})

test('a day in progress survives a reload', async ({ page }) => {
  await playRound(page, 0, 'fooled')
  await markTrue(page, ROUNDS[1].truths[0])
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: /Round 2 of 3/ })).toBeVisible()
  await expect(page.getByText('1 of 3 truths cleared')).toBeVisible()
})

test('keyboard play', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'Keyboards are a desktop feature')
  await page.keyboard.press('1')
  await page.keyboard.press('Enter')
  await expect(page.getByText(/1 of 3 truths cleared|Round 1 done/)).toBeVisible()
})
