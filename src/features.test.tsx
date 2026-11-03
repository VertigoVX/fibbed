import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import App from './App'
import { localBackend, type Account, type Backend, type Player } from './lib/backend'
import { getPuzzle } from './data/puzzles'
import type { HistoryEntry } from './lib/stats'

// Paper No. 3 (4 November 2026).
const NOW = new Date(2026, 10, 4, 9, 0)
const puzzle = getPuzzle(3)
type User = ReturnType<typeof userEvent.setup>

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

async function markTrue(user: User, text: string) {
  await user.click(screen.getByRole('button', { name: new RegExp(escape(text.slice(0, 30))) }))
  await user.click(screen.getByRole('button', { name: 'Mark as true' }))
}

/** catch = clear all three truths; a number = clear that many truths, then pick the fib. */
async function playDay(user: User, plan: ('catch' | number)[]) {
  await screen.findByRole('list', { name: 'Statements' })
  for (let i = 0; i < 3; i++) {
    const round = puzzle.rounds[i]
    const p = plan[i]
    if (p === 'catch') for (const t of round.truths) await markTrue(user, t.text)
    else {
      for (const t of round.truths.slice(0, p)) await markTrue(user, t.text)
      await markTrue(user, round.fib.text)
    }
    if (i < 2) await user.click(screen.getByRole('button', { name: 'Next round' }))
  }
  await screen.findByRole('region', { name: 'Your record' })
}

function memoryAccount(opts: { player?: Player | null; history?: HistoryEntry[] } = {}) {
  let player = opts.player ?? null
  const listeners = new Set<(p: Player | null) => void>()
  const account: Account & { signInAs(p: Player): void } = {
    available: true,
    current: async () => player,
    sendLink: vi.fn(async () => ({ ok: true as const })),
    signOut: vi.fn(async () => {
      player = null
      listeners.forEach((l) => l(null))
    }),
    onChange(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    history: vi.fn(async () => opts.history ?? []),
    claimDevice: vi.fn(async () => {}),
    signInAs(p) {
      player = p
      listeners.forEach((l) => l(p))
    },
  }
  return account
}

function setup(backend: Partial<Backend> = {}) {
  const user = userEvent.setup()
  const full = { ...localBackend(), ...backend } as Backend
  render(<App backend={full} now={NOW} clientId="device-1" />)
  return { user, backend: full }
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('how you compare', () => {
  it('shows your score and where it sits among today’s players', async () => {
    // You will score 7 (6 truths + 1 fib). Five players scored lower, two the same, three higher.
    const getScoreCounts = vi.fn().mockResolvedValue({ 2: 2, 5: 3, 7: 3, 10: 2, 12: 1 })
    const { user } = setup({ getScoreCounts })
    await playDay(user, ['catch', 2, 1])
    const chart = await screen.findByRole('region', { name: 'How you compare' })
    expect(within(chart).getByText('You scored 7 of 12.')).toBeInTheDocument()
    expect(within(chart).getByText('Better than 45% of today’s 11 players.')).toBeInTheDocument()
    expect(within(chart).getByRole('img', { name: /scores of today’s players/i })).toBeInTheDocument()
    const table = within(chart).getByRole('table', { name: 'Players by score' })
    expect(within(table).getAllByRole('row')).toHaveLength(14) // header + scores 0 to 12
  })

  it('waits for your own result to be saved before asking for the spread', async () => {
    const order: string[] = []
    const recordResult = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 20))
      order.push('saved')
    })
    const getScoreCounts = vi.fn(async () => {
      order.push('asked')
      return { 3: 1 }
    })
    const { user } = setup({ recordResult, getScoreCounts })
    await playDay(user, [0, 0, 0])
    await waitFor(() => expect(getScoreCounts).toHaveBeenCalled())
    expect(order).toEqual(['saved', 'asked'])
  })

  it('says so when you are the first to finish', async () => {
    const { user } = setup({ getScoreCounts: vi.fn().mockResolvedValue({ 12: 1 }) })
    await playDay(user, ['catch', 'catch', 'catch'])
    expect(await screen.findByText('You’re the first to finish today’s paper.')).toBeInTheDocument()
  })

  it('still shows your score offline, without the chart', async () => {
    const { user } = setup()
    await playDay(user, ['catch', 0, 0])
    expect(await screen.findByText('You scored 4 of 12.')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /scores of today’s players/i })).not.toBeInTheDocument()
  })
})

describe('sharing and inviting', () => {
  it('offers the result to X, WhatsApp, Bluesky and Facebook', async () => {
    const { user } = setup()
    await playDay(user, ['catch', 0, 'catch'])
    const share = screen.getByRole('region', { name: 'Share' })
    const x = within(share).getByRole('link', { name: 'X' })
    expect(x.getAttribute('href')).toMatch(/^https:\/\/x\.com\/intent\/post\?text=/)
    expect(decodeURIComponent(x.getAttribute('href')!)).toContain('Fibbed No. 3')
    expect(within(share).getByRole('link', { name: 'WhatsApp' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\?text=Fibbed/)
    expect(within(share).getByRole('link', { name: 'Bluesky' }).getAttribute('href')).toMatch(/^https:\/\/bsky\.app\/intent\/compose\?text=/)
    expect(within(share).getByRole('link', { name: 'Facebook' }).getAttribute('href')).toMatch(/^https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?u=/)
    for (const link of within(share).getAllByRole('link')) expect(link).toHaveAttribute('target', '_blank')
  })

  it('invites a friend with a short pitch and the link', async () => {
    const { user } = setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    await playDay(user, [0, 0, 0])
    await user.click(screen.getByRole('button', { name: 'Invite a friend' }))
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/Three rounds a day.*Can you spot the fibs\?\nhttp/s))
    expect(await screen.findByText('Invite copied. Send it to a friend.')).toBeInTheDocument()
  })
})

describe('accounts', () => {
  it('offers sign-in from the masthead and emails a link', async () => {
    const account = memoryAccount()
    const { user } = setup({ account })
    await screen.findByRole('list', { name: 'Statements' })
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Keep your streak on every device' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Email'), 'sam@example.com')
    await user.click(screen.getByRole('button', { name: 'Email me a sign-in link' }))
    expect(account.sendLink).toHaveBeenCalledWith('sam@example.com', expect.stringMatching(/^http/))
    expect(await screen.findByText(/Check your inbox at sam@example\.com/)).toBeInTheDocument()
  })

  it('checks the email address before sending', async () => {
    const account = memoryAccount()
    const { user } = setup({ account })
    await screen.findByRole('list', { name: 'Statements' })
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Email me a sign-in link' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter an email address')
    expect(account.sendLink).not.toHaveBeenCalled()
  })

  it('goes back to the game without losing progress', async () => {
    const { user } = setup({ account: memoryAccount() })
    await screen.findByRole('list', { name: 'Statements' })
    await markTrue(user, puzzle.rounds[0].truths[0].text)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await user.click(screen.getByRole('button', { name: 'Back to today’s paper' }))
    expect(await screen.findByText('1 of 3 truths cleared')).toBeInTheDocument()
  })

  it('on signing in, claims this device’s results and shows the combined record', async () => {
    const account = memoryAccount({
      history: [
        { puzzleNumber: 1, fibsCaught: 3, cleared: 9 },
        { puzzleNumber: 2, fibsCaught: 1, cleared: 5 },
      ],
    })
    const { user } = setup({ account })
    await playDay(user, ['catch', 0, 0])
    account.signInAs({ id: 'u1', email: 'sam@example.com' })
    await waitFor(() => expect(account.claimDevice).toHaveBeenCalledWith('device-1'))
    const record = screen.getByRole('region', { name: 'Your record' })
    await waitFor(() => expect(within(record).getByText('Played').previousSibling).toHaveTextContent('3'))
    expect(within(record).getByText('Perfect').previousSibling).toHaveTextContent('1')
    expect(within(record).getByText('Streak').previousSibling).toHaveTextContent('3')
  })

  it('lists past papers for a signed-in player', async () => {
    const account = memoryAccount({
      player: { id: 'u1', email: 'sam@example.com' },
      history: [
        { puzzleNumber: 1, fibsCaught: 3, cleared: 9 },
        { puzzleNumber: 2, fibsCaught: 1, cleared: 5 },
      ],
    })
    const { user } = setup({ account })
    await user.click(await screen.findByRole('button', { name: 'Your papers' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Your papers' })).toBeInTheDocument()
    expect(screen.getByText('sam@example.com')).toBeInTheDocument()
    const table = await screen.findByRole('table', { name: 'Past papers' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent(/No\. 2.*1 of 3.*6/)
    expect(rows[1]).toHaveTextContent(/No\. 1.*3 of 3.*12/)
  })

  it('signs out', async () => {
    const account = memoryAccount({ player: { id: 'u1', email: 'sam@example.com' } })
    const { user } = setup({ account })
    await user.click(await screen.findByRole('button', { name: 'Your papers' }))
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('suggests signing in after a game when signed out', async () => {
    const { user } = setup({ account: memoryAccount() })
    await playDay(user, [0, 0, 0])
    expect(screen.getByRole('button', { name: 'Sign in to keep your streak' })).toBeInTheDocument()
  })

  it('hides accounts entirely when the game runs offline', async () => {
    setup()
    await screen.findByRole('list', { name: 'Statements' })
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument()
  })
})

describe('the chart always includes you', () => {
  it('counts you even when the server’s spread has not caught up', async () => {
    const { user } = setup({ getScoreCounts: vi.fn().mockResolvedValue({ 0: 3 }) })
    await playDay(user, ['catch', 0, 0]) // scores 4
    expect(await screen.findByText('Better than 75% of today’s 4 players.')).toBeInTheDocument()
  })
})
