import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import App from './App'
import { localBackend, type Backend } from './lib/backend'
import { getPuzzle } from './data/puzzles'
import { arrange } from './lib/game'

// 4 November 2026 is paper No. 3: Trees (easy), Chocolate (medium), The Solar System (hard).
const NOW = new Date(2026, 10, 4, 9, 0)
const puzzle = getPuzzle(3)
const [r1, r2, r3] = puzzle.rounds

type User = ReturnType<typeof userEvent.setup>

function setup(backend: Backend = localBackend()) {
  const user = userEvent.setup()
  const utils = render(<App backend={backend} now={NOW} />)
  return { user, backend, ...utils }
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const ready = () => screen.findByRole('list', { name: 'Statements' })
const statement = (text: string) => screen.getByRole('button', { name: new RegExp(escape(text.slice(0, 30))) })

async function markTrue(user: User, text: string) {
  await user.click(statement(text))
  await user.click(screen.getByRole('button', { name: 'Mark as true' }))
}

/** Clear a round (caught) or walk into its fib (fooled). */
async function play(user: User, round: typeof r1, how: 'catch' | 'fooled') {
  if (how === 'catch') for (const t of round.truths) await markTrue(user, t.text)
  else await markTrue(user, round.fib.text)
}

const nextRound = (user: User) => user.click(screen.getByRole('button', { name: 'Next round' }))

async function playDay(user: User, plan: ('catch' | 'fooled')[]) {
  await ready()
  for (let i = 0; i < 3; i++) {
    await play(user, puzzle.rounds[i], plan[i])
    if (i < 2) await nextRound(user)
  }
}

describe('round 1', () => {
  it('shows the round, its theme and four statements', async () => {
    setup()
    await ready()
    expect(screen.getByText('No. 3')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: /Round 1 of 3.*Trees/ })).toBeInTheDocument()
    const buttons = within(screen.getByRole('list', { name: 'Statements' })).getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(arrange(puzzle, 0).map((s) => expect.stringContaining(s.text)))
  })

  it('needs a statement selected before marking', async () => {
    const { user } = setup()
    await ready()
    expect(screen.getByRole('button', { name: 'Mark as true' })).toBeDisabled()
    await user.click(statement(r1.truths[0].text))
    expect(statement(r1.truths[0].text)).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Mark as true' })).toBeEnabled()
  })

  it('clears a truth and counts it', async () => {
    const { user } = setup()
    await ready()
    await markTrue(user, r1.truths[0].text)
    expect(statement(r1.truths[0].text)).toBeDisabled()
    expect(statement(r1.truths[0].text)).toHaveAccessibleName(expect.stringMatching(/cleared/i))
    expect(screen.getByText('1 of 3 truths cleared')).toBeInTheDocument()
  })
})

describe('between rounds', () => {
  it('shows the verdict and correction, then moves on when asked', async () => {
    const { user } = setup()
    await ready()
    await play(user, r1, 'fooled')
    expect(screen.getByRole('heading', { name: 'Fibbed.' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Correction' })).toHaveTextContent(r1.fib.explanation)
    await nextRound(user)
    expect(screen.getByRole('heading', { level: 1, name: /Round 2 of 3.*Chocolate/ })).toBeInTheDocument()
    expect(screen.getByText('0 of 3 truths cleared')).toBeInTheDocument()
  })

  it('celebrates a caught fib', async () => {
    const { user } = setup()
    await ready()
    await play(user, r1, 'catch')
    expect(screen.getByRole('heading', { name: 'Caught it.' })).toBeInTheDocument()
  })

  it('resumes at the right round after a reload', async () => {
    const { user, unmount } = setup()
    await ready()
    await play(user, r1, 'catch')
    await nextRound(user)
    await markTrue(user, r2.truths[1].text)
    unmount()
    setup()
    await ready()
    expect(screen.getByRole('heading', { level: 1, name: /Round 2 of 3/ })).toBeInTheDocument()
    expect(screen.getByText('1 of 3 truths cleared')).toBeInTheDocument()
  })
})

describe('the final paper', () => {
  it('totals the day, records it once and shows every correction', async () => {
    const backend = localBackend()
    const record = vi.spyOn(backend, 'recordResult')
    const { user } = setup(backend)
    await playDay(user, ['catch', 'fooled', 'catch'])
    expect(await screen.findByRole('heading', { level: 1, name: 'You caught 2 of 3 fibs.' })).toBeInTheDocument()
    expect(record).toHaveBeenCalledTimes(1)
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ puzzleNumber: 3, fibsCaught: 2, readerCaught: true }))
    for (const r of puzzle.rounds) expect(screen.getByRole('region', { name: `Correction: ${r.theme}` })).toHaveTextContent(r.fib.explanation)
  })

  it('lists every truth with its source', async () => {
    const { user } = setup()
    await playDay(user, ['fooled', 'fooled', 'fooled'])
    for (const r of puzzle.rounds)
      for (const t of r.truths)
        expect(screen.getByRole('link', { name: new RegExp(`source.*${escape(t.text.slice(0, 20))}`, 'i') })).toHaveAttribute('href', t.source!.url)
  })

  it('calls a perfect day a perfect paper and shows the record', async () => {
    const { user } = setup()
    await playDay(user, ['catch', 'catch', 'catch'])
    expect(await screen.findByRole('heading', { level: 1, name: 'A perfect paper.' })).toBeInTheDocument()
    const score = screen.getByRole('region', { name: 'Your record' })
    expect(within(score).getByText('Played').previousSibling).toHaveTextContent('1')
    expect(within(score).getByText('Perfect').previousSibling).toHaveTextContent('1')
    expect(within(score).getByText('Streak').previousSibling).toHaveTextContent('1')
  })

  it('shows the finished paper on a later visit the same day', async () => {
    const first = setup()
    await playDay(first.user, ['fooled', 'fooled', 'fooled'])
    first.unmount()
    setup()
    expect(await screen.findByRole('heading', { level: 1, name: 'You caught 0 of 3 fibs.' })).toBeInTheDocument()
  })

  it('shows how other players did', async () => {
    const backend = { ...localBackend(), getStats: vi.fn().mockResolvedValue({ players: 120, perfect: 18, readerFooled: 64 }) }
    const { user } = setup(backend)
    await playDay(user, ['catch', 'catch', 'fooled'])
    expect(await screen.findByText('120 players today, 18 with a perfect paper. Round 3 fooled 64 of them.')).toBeInTheDocument()
  })

  it('copies a spoiler-free result', async () => {
    const { user } = setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    await playDay(user, ['catch', 'fooled', 'catch'])
    await user.click(screen.getByRole('button', { name: 'Share result' }))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Fibbed #3\n🟩🟩🟩🕵️\n🟥\n🟩🟩🟩🕵️\n2 of 3 fibs caught'))
    expect(await screen.findByText('Copied. Paste it anywhere.')).toBeInTheDocument()
  })
})

describe('keyboard play on desktop', () => {
  it('selects with number keys and marks with Enter', async () => {
    const { user } = setup()
    await ready()
    const order = arrange(puzzle, 0)
    const i = order.findIndex((s) => s.id !== r1.fib.id)
    await user.keyboard(String(i + 1))
    expect(statement(order[i].text)).toHaveAttribute('aria-pressed', 'true')
    await user.keyboard('{Enter}')
    expect(screen.getByText('1 of 3 truths cleared')).toBeInTheDocument()
  })

  it('moves to the next round with Enter', async () => {
    const { user } = setup()
    await ready()
    await play(user, r1, 'fooled')
    await user.keyboard('{Enter}')
    expect(screen.getByRole('heading', { level: 1, name: /Round 2 of 3/ })).toBeInTheDocument()
  })

  it('leaves number keys alone while typing', async () => {
    const { user } = setup()
    await playDay(user, ['fooled', 'fooled', 'fooled'])
    await user.type(screen.getByLabelText('Your fib'), '3')
    expect(screen.getByLabelText('Your fib')).toHaveValue('3')
  })
})

describe('writing tomorrow’s fib', () => {
  const tomorrow = getPuzzle(4).rounds[2]

  it('asks for a fib for tomorrow’s round 3', async () => {
    const { user } = setup()
    await playDay(user, ['fooled', 'fooled', 'fooled'])
    expect(screen.getByRole('heading', { name: `Tomorrow’s round 3: ${tomorrow.theme}` })).toBeInTheDocument()
  })

  it('explains what is wrong with a weak fib', async () => {
    const { user } = setup()
    await playDay(user, ['fooled', 'fooled', 'fooled'])
    await user.type(screen.getByLabelText('Your fib'), 'Too short')
    await user.click(screen.getByRole('button', { name: 'Send fib' }))
    expect(await screen.findByText(/at least 20 characters/)).toBeInTheDocument()
    expect(screen.getByLabelText('Your fib')).toHaveFocus()
  })

  it('sends a good fib for tomorrow with the player’s name', async () => {
    const backend = localBackend()
    const submit = vi.spyOn(backend, 'submitFib')
    const { user } = setup(backend)
    await playDay(user, ['fooled', 'fooled', 'fooled'])
    await user.type(screen.getByLabelText('Your fib'), 'Your little toe has no bones in it at all.')
    await user.type(screen.getByLabelText(/Name for the credit/), 'Sam')
    await user.click(screen.getByRole('button', { name: 'Send fib' }))
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(expect.objectContaining({ puzzleNumber: 4, text: 'Your little toe has no bones in it at all.', author: 'Sam' })),
    )
    expect(await screen.findByText(/only on this device/i)).toBeInTheDocument()
  })

  it('shows a server error and keeps the draft', async () => {
    const backend = { ...localBackend(), online: true, submitFib: vi.fn().mockResolvedValue({ ok: false, error: 'Could not send your fib. Try again in a moment.' }) }
    const { user } = setup(backend)
    await playDay(user, ['fooled', 'fooled', 'fooled'])
    await user.type(screen.getByLabelText('Your fib'), 'Your little toe has no bones in it at all.')
    await user.click(screen.getByRole('button', { name: 'Send fib' }))
    expect(await screen.findByText('Could not send your fib. Try again in a moment.')).toBeInTheDocument()
    expect(screen.getByLabelText('Your fib')).toHaveValue('Your little toe has no bones in it at all.')
  })
})

describe('reader fibs', () => {
  it('run in round 3, flagged in the round and credited in the correction', async () => {
    const featured = { text: 'Jupiter has a solid surface of frozen hydrogen ice.', author: 'Lee' }
    const backend = { ...localBackend(), getFeaturedFib: vi.fn().mockResolvedValue(featured) }
    const { user } = setup(backend)
    await ready()
    await play(user, r1, 'fooled')
    await nextRound(user)
    await play(user, r2, 'fooled')
    await nextRound(user)
    expect(screen.getByText(/written by a reader/i)).toBeInTheDocument()
    expect(statement(featured.text)).toBeInTheDocument()
    expect(screen.queryByText(r3.fib.text)).not.toBeInTheDocument()
    await markTrue(user, featured.text)
    expect(await screen.findByRole('region', { name: `Correction: ${r3.theme}` })).toHaveTextContent('Invented by Lee')
  })
})
