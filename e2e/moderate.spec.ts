import { test, expect, type Page, type Route } from '@playwright/test'

// The editor's desk against a mocked Supabase, signed in as an editor.
const NOW = new Date(2026, 10, 1, 20, 0) // before launch: tomorrow is No. 2, Honey bees
const SUPABASE = 'http://127.0.0.1:4174'

type Fib = { id: string; puzzle_number: number; text: string; author: string | null; status: string; featured: boolean; created_at: string }

async function deskWith(page: Page, fibs: Fib[], opts: { editor?: boolean } = {}) {
  const calls: string[] = []
  await page.route(`${SUPABASE}/**`, async (route: Route) => {
    const url = new URL(route.request().url())
    const name = url.pathname.split('/').pop()!
    const body = route.request().postDataJSON?.() ?? {}
    if (url.pathname.includes('/rpc/')) calls.push(name)
    if (name === 'is_editor') return route.fulfill({ json: opts.editor ?? true })
    if (name === 'fib_counts') {
      const counts: Record<number, { pending: number; total: number }> = {}
      for (const f of fibs) {
        counts[f.puzzle_number] ??= { pending: 0, total: 0 }
        counts[f.puzzle_number].total++
        if (f.status === 'pending') counts[f.puzzle_number].pending++
      }
      return route.fulfill({ json: Object.entries(counts).map(([n, c]) => ({ puzzle_number: +n, ...c })) })
    }
    if (name === 'feature_fib') {
      const f = fibs.find((x) => x.id === body.fib_id)!
      fibs.filter((x) => x.puzzle_number === f.puzzle_number).forEach((x) => (x.featured = false))
      Object.assign(f, { featured: true, status: 'approved' })
      return route.fulfill({ status: 204, body: '' })
    }
    if (name === 'set_fib_status') {
      const f = fibs.find((x) => x.id === body.fib_id)!
      Object.assign(f, { status: body.new_status, featured: f.featured && body.new_status === 'approved' })
      return route.fulfill({ status: 204, body: '' })
    }
    if (name === 'use_house_fib') {
      fibs.filter((x) => x.puzzle_number === body.n).forEach((x) => (x.featured = false))
      return route.fulfill({ status: 204, body: '' })
    }
    if (name === 'fibs') {
      const n = Number(url.searchParams.get('puzzle_number')?.replace('eq.', ''))
      return route.fulfill({ json: fibs.filter((f) => f.puzzle_number === n) })
    }
    return route.fulfill({ json: [] })
  })
  await page.clock.setFixedTime(NOW)
  await page.addInitScript(() => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    localStorage.setItem(
      'fibbed-editor',
      JSON.stringify({
        access_token: 'header.eyJzdWIiOiJlZCJ9.sig',
        refresh_token: 'r',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: exp,
        user: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', email: 'ed@example.com', aud: 'authenticated', role: 'authenticated' },
      }),
    )
  })
  await page.goto('/moderate.html')
  return calls
}

const pending = (over: Partial<Fib>): Fib => ({
  id: 'f1',
  puzzle_number: 2,
  text: 'Honey bees rub pollen onto other honey bees as a sign that they like each other',
  author: 'Tristan',
  status: 'pending',
  featured: false,
  created_at: '2026-11-01T17:30:00Z',
  ...over,
})

test('an editor runs a player’s fib for tomorrow', async ({ page }) => {
  const calls = await deskWith(page, [pending({}), pending({ id: 'f2', author: null, text: 'Honey bees can count up to four flowers at once.' })])
  await expect(page.getByRole('heading', { level: 1, name: /No\. 2.*Honey bees/ })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Submitted fibs' }).getByRole('listitem')).toHaveCount(2)

  await page.getByRole('button', { name: 'Run this fib' }).first().click()
  await expect(page.getByRole('status')).toHaveText('Running Tristan’s fib on No. 2.')
  await expect(page.getByRole('region', { name: 'Running on this day' })).toContainText('rub pollen')
  expect(calls).toContain('feature_fib')

  await page.getByRole('button', { name: 'Reject' }).last().click()
  await expect(page.getByText('Rejected', { exact: true })).toBeVisible()
  await expect(page.locator('html')).toHaveJSProperty('scrollWidth', await page.evaluate(() => document.documentElement.clientWidth))
})

test('days with fibs waiting link to their day', async ({ page }) => {
  await deskWith(page, [pending({ id: 'x', puzzle_number: 6 })])
  await page.getByRole('link', { name: /No\. 6.*1 waiting/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: /No\. 6/ })).toBeVisible()
  await expect(page).toHaveURL(/\?day=6$/)
})

test('a signed-in non-editor is told how to get access', async ({ page }) => {
  await deskWith(page, [], { editor: false })
  await expect(page.getByRole('heading', { name: 'Editors only' })).toBeVisible()
  await expect(page.getByText(/insert into public\.editors/)).toBeVisible()
})
