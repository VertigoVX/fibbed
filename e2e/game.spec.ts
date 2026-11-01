import { test, expect, type Page } from '@playwright/test'

// Puzzle #3, The Solar System: the fib is the Mercury statement.
const DAY = new Date(2026, 10, 4, 9, 0)
const TRUTHS = ['Saturn is less dense', 'A single day on Venus', 'Olympus Mons', 'Neptune was predicted']
const FIB = 'Mercury is the hottest'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(DAY)
  await page.goto('/')
  await expect(page.getByRole('list', { name: 'Statements' })).toBeVisible()
})

async function markTrue(page: Page, text: string) {
  await page.getByRole('button', { name: new RegExp(text) }).click()
  await page.getByRole('button', { name: 'Mark as true' }).click()
}

async function noSideScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

test('shows today’s paper without sideways scrolling', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1, name: 'The Solar System' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Statements' }).getByRole('button')).toHaveCount(5)
  await noSideScroll(page)
})

test('keeps the mark button in thumb reach and big enough to tap', async ({ page }) => {
  const button = page.getByRole('button', { name: 'Mark as true' })
  await expect(button).toBeInViewport()
  const box = (await button.boundingBox())!
  expect(box.height).toBeGreaterThanOrEqual(44)
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

test('catching the fib, start to finish', async ({ page, context, browserName }) => {
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  for (const t of TRUTHS) await markTrue(page, t)
  await expect(page.getByRole('heading', { name: 'You caught the fib.' })).toBeFocused()
  await expect(page.getByRole('region', { name: 'Correction' })).toContainText('Venus is hotter')
  await expect(page.getByRole('region', { name: 'Your record' })).toContainText('1Played')
  await noSideScroll(page)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'You caught the fib.' })).toBeVisible()
})

test('getting fibbed, then writing tomorrow’s fib', async ({ page }) => {
  await markTrue(page, TRUTHS[0])
  await markTrue(page, FIB)
  await expect(page.getByRole('heading', { name: 'You were fibbed.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tomorrow: The human body' })).toBeVisible()

  await page.getByLabel('Your fib').fill('Your little toe has no bones in it at all.')
  await page.getByRole('button', { name: 'Send fib' }).click()
  await expect(page.getByText('“Your little toe has no bones in it at all.”')).toBeVisible()
  await noSideScroll(page)
})

test('a game in progress survives a reload', async ({ page }) => {
  await markTrue(page, TRUTHS[2])
  await page.reload()
  await expect(page.getByText('1 of 4 truths cleared')).toBeVisible()
})

test('keyboard play', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'Keyboards are a desktop feature')
  await page.keyboard.press('1')
  await page.keyboard.press('Enter')
  await expect(page.getByText(/of 4 truths cleared|You were fibbed\./).first()).toBeVisible()
})
