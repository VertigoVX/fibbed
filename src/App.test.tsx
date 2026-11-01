import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import App from './App'
import { localBackend, type Backend } from './lib/backend'
import { getPuzzle } from './data/puzzles'
import { arrange } from './lib/game'

// Puzzle #3 (The Solar System) is the day of 4 November 2026.
const NOW = new Date(2026, 10, 4, 9, 0)
const puzzle = getPuzzle(3)
const truths = puzzle.truths.map((t) => t.text)

function setup(backend: Backend = localBackend()) {
  const user = userEvent.setup()
  const utils = render(<App backend={backend} now={NOW} />)
  return { user, backend, ...utils }
}

const statement = (text: string) => screen.getByRole('button', { name: new RegExp(escape(text.slice(0, 30))) })
const ready = () => screen.findByRole('list', { name: 'Statements' })
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

async function markTrue(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.click(statement(text))
  await user.click(screen.getByRole('button', { name: 'Mark as true' }))
}

describe('the front page', () => {
  it('shows today’s number, theme and all five statements', async () => {
    setup()
    expect(screen.getByRole('heading', { level: 1, name: 'The Solar System' })).toBeInTheDocument()
    await ready()
    expect(screen.getByText('No. 3')).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Statements' })
    expect(within(list).getAllByRole('button')).toHaveLength(5)
    expect(within(list).getAllByRole('button').map((b) => b.textContent)).toEqual(
      arrange(puzzle).map((s) => expect.stringContaining(s.text)),
    )
  })

  it('needs a statement selected before marking', async () => {
    const { user } = setup()
    await ready()
    const mark = screen.getByRole('button', { name: 'Mark as true' })
    expect(mark).toBeDisabled()
    await user.click(statement(truths[0]))
    expect(statement(truths[0])).toHaveAttribute('aria-pressed', 'true')
    expect(mark).toBeEnabled()
  })

  it('clears a true statement and counts progress', async () => {
    const { user } = setup()
    await ready()
    await markTrue(user, truths[0])
    expect(statement(truths[0])).toBeDisabled()
    expect(statement(truths[0])).toHaveAccessibleName(expect.stringMatching(/cleared/i))
    expect(screen.getByText('1 of 4 truths cleared')).toBeInTheDocument()
  })

  it('resumes a game in progress after a reload', async () => {
    const { user, unmount } = setup()
    await ready()
    await markTrue(user, truths[1])
    unmount()
    setup()
    expect(await screen.findByText('1 of 4 truths cleared')).toBeInTheDocument()
  })
})

describe('keyboard play on desktop', () => {
  it('selects with number keys and marks with Enter', async () => {
    const { user } = setup()
    await ready()
    const order = arrange(puzzle)
    const firstTruth = order.findIndex((s) => s.id !== puzzle.fib.id)
    await user.keyboard(String(firstTruth + 1))
    expect(statement(order[firstTruth].text)).toHaveAttribute('aria-pressed', 'true')
    await user.keyboard('{Enter}')
    expect(screen.getByText('1 of 4 truths cleared')).toBeInTheDocument()
  })

  it('leaves number keys alone while typing', async () => {
    const { user } = setup()
    await ready()
    await markTrue(user, puzzle.fib.text)
    await user.type(screen.getByLabelText('Your fib'), '3')
    expect(screen.getByLabelText('Your fib')).toHaveValue('3')
  })
})

describe('getting fibbed', () => {
  it('labels every truth plainly once the game is over', async () => {
    const { user } = setup()
    await ready()
    await markTrue(user, truths[0])
    await markTrue(user, puzzle.fib.text)
    expect(statement(truths[0])).toHaveAccessibleName(expect.stringMatching(/True$/))
    expect(statement(truths[0])).not.toHaveAccessibleName(expect.stringMatching(/cleared/i))
  })

  it('reveals the fib as a correction with its explanation', async () => {
    const { user } = setup()
    await ready()
    await markTrue(user, truths[0])
    await markTrue(user, puzzle.fib.text)
    expect(await screen.findByRole('heading', { name: 'You were fibbed.' })).toBeInTheDocument()
    const correction = screen.getByRole('region', { name: 'Correction' })
    expect(correction).toHaveTextContent(puzzle.fib.text)
    expect(correction).toHaveTextContent(puzzle.fib.explanation)
  })

  it('lists the four truths with their sources', async () => {
    const { user } = setup()
    await ready()
    await markTrue(user, puzzle.fib.text)
    for (const t of puzzle.truths) {
      expect(screen.getByRole('link', { name: new RegExp(`source.*${escape(t.text.slice(0, 20))}`, 'i') })).toHaveAttribute(
        'href',
        t.source!.url,
      )
    }
  })
})

describe('catching the fib', () => {
  it('celebrates, records the result and shows the box score', async () => {
    const backend = localBackend()
    const record = vi.spyOn(backend, 'recordResult')
    const { user } = setup(backend)
    await ready()
    for (const t of truths) await markTrue(user, t)
    expect(await screen.findByRole('heading', { name: 'You caught the fib.' })).toBeInTheDocument()
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ puzzleNumber: 3, caught: true }))
    const score = screen.getByRole('region', { name: 'Your record' })
    expect(within(score).getByText('Played').previousSibling).toHaveTextContent('1')
    expect(within(score).getByText('Streak').previousSibling).toHaveTextContent('1')
  })

  it('shows the finished paper on a later visit the same day', async () => {
    const first = setup()
    await ready()
    await markTrue(first.user, puzzle.fib.text)
    first.unmount()
    setup()
    expect(await screen.findByRole('heading', { name: 'You were fibbed.' })).toBeInTheDocument()
  })

  it('shows how other players did when the server has numbers', async () => {
    const backend = { ...localBackend(), getStats: vi.fn().mockResolvedValue({ players: 120, caught: 42 }) }
    const { user } = setup(backend)
    await ready()
    await markTrue(user, puzzle.fib.text)
    expect(await screen.findByText('42 of 120 players caught it.')).toBeInTheDocument()
  })
})

describe('sharing', () => {
  it('copies a spoiler-free result when the share sheet is unavailable', async () => {
    const { user } = setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    await ready()
    await markTrue(user, truths[2])
    await markTrue(user, puzzle.fib.text)
    await user.click(screen.getByRole('button', { name: 'Share result' }))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Fibbed #3\n🟩🟥 Fibbed after 1 of 4'))
    expect(await screen.findByText('Copied. Paste it anywhere.')).toBeInTheDocument()
  })
})

describe('writing tomorrow’s fib', () => {
  async function finish(user: ReturnType<typeof userEvent.setup>) {
    await ready()
    await markTrue(user, puzzle.fib.text)
  }

  it('names tomorrow’s theme', async () => {
    const { user } = setup()
    await finish(user)
    expect(screen.getByRole('heading', { name: `Tomorrow: ${getPuzzle(4).theme}` })).toBeInTheDocument()
  })

  it('explains what is wrong with a weak fib', async () => {
    const { user } = setup()
    await finish(user)
    await user.type(screen.getByLabelText('Your fib'), 'Too short')
    await user.click(screen.getByRole('button', { name: 'Send fib' }))
    expect(await screen.findByText(/at least 20 characters/)).toBeInTheDocument()
    expect(screen.getByLabelText('Your fib')).toHaveFocus()
  })

  it('sends a good fib for tomorrow’s puzzle with the player’s name', async () => {
    const backend = localBackend()
    const submit = vi.spyOn(backend, 'submitFib')
    const { user } = setup(backend)
    await finish(user)
    await user.type(screen.getByLabelText('Your fib'), 'Your little toe has no bones in it at all.')
    await user.type(screen.getByLabelText(/Name for the credit/), 'Sam')
    await user.click(screen.getByRole('button', { name: 'Send fib' }))
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({ puzzleNumber: 4, text: 'Your little toe has no bones in it at all.', author: 'Sam' }),
      ),
    )
    expect(await screen.findByText(/Your little toe has no bones/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Your fib')).not.toBeInTheDocument()
  })

  it('says plainly when fibs only stay on this device', async () => {
    const { user } = setup()
    await finish(user)
    await user.type(screen.getByLabelText('Your fib'), 'Your little toe has no bones in it at all.')
    await user.click(screen.getByRole('button', { name: 'Send fib' }))
    expect(await screen.findByText(/only on this device/i)).toBeInTheDocument()
  })

  it('shows a server error and keeps the draft', async () => {
    const backend = { ...localBackend(), online: true, submitFib: vi.fn().mockResolvedValue({ ok: false, error: 'Could not send your fib. Try again in a moment.' }) }
    const { user } = setup(backend)
    await finish(user)
    await user.type(screen.getByLabelText('Your fib'), 'Your little toe has no bones in it at all.')
    await user.click(screen.getByRole('button', { name: 'Send fib' }))
    expect(await screen.findByText('Could not send your fib. Try again in a moment.')).toBeInTheDocument()
    expect(screen.getByLabelText('Your fib')).toHaveValue('Your little toe has no bones in it at all.')
  })
})

describe('community fibs', () => {
  it('runs the featured fib in place of the house fib and credits its author', async () => {
    const featured = { text: 'Jupiter has a solid surface of frozen hydrogen ice.', author: 'Lee' }
    const backend = { ...localBackend(), getFeaturedFib: vi.fn().mockResolvedValue(featured) }
    const { user } = setup(backend)
    expect(await screen.findByRole('button', { name: /Jupiter has a solid surface/ })).toBeInTheDocument()
    expect(screen.queryByText(puzzle.fib.text)).not.toBeInTheDocument()
    await markTrue(user, featured.text)
    expect(screen.getByRole('region', { name: 'Correction' })).toHaveTextContent('Invented by Lee')
  })
})
