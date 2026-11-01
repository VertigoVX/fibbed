import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Moderate } from './Moderate'
import type { EditorApi, EditorFib, FibStatus } from './editorApi'
import { getPuzzle } from '../data/puzzles'

// 1 November 2026 is before launch, so today is clamped to #1 and tomorrow is #2 (Honey bees).
const NOW = new Date(2026, 10, 1, 20, 0)

function memoryApi(opts: { signedIn?: boolean; editor?: boolean; fibs?: EditorFib[] } = {}) {
  let signedIn = opts.signedIn ?? true
  const fibs: EditorFib[] = (opts.fibs ?? []).map((f) => ({ ...f }))
  const api: EditorApi = {
    async session() {
      return signedIn ? { email: 'ed@example.com' } : null
    },
    async signIn(_email, password) {
      if (password !== 'right') return { ok: false, error: 'That email and password did not match an account.' }
      signedIn = true
      return { ok: true }
    },
    async signOut() {
      signedIn = false
    },
    async isEditor() {
      return opts.editor ?? true
    },
    async counts() {
      const out: Record<number, { pending: number; total: number }> = {}
      for (const f of fibs) {
        out[f.puzzleNumber] ??= { pending: 0, total: 0 }
        out[f.puzzleNumber].total++
        if (f.status === 'pending') out[f.puzzleNumber].pending++
      }
      return out
    },
    async fibs(n) {
      return fibs.filter((f) => f.puzzleNumber === n).map((f) => ({ ...f }))
    },
    async feature(id) {
      const target = fibs.find((f) => f.id === id)!
      fibs.filter((f) => f.puzzleNumber === target.puzzleNumber).forEach((f) => (f.featured = false))
      target.featured = true
      target.status = 'approved'
    },
    async setStatus(id, status: FibStatus) {
      const f = fibs.find((x) => x.id === id)!
      f.status = status
      if (status !== 'approved') f.featured = false
    },
    async useHouseFib(n) {
      fibs.filter((f) => f.puzzleNumber === n).forEach((f) => (f.featured = false))
    },
  }
  return api
}

const fib = (over: Partial<EditorFib>): EditorFib => ({
  id: 'f1',
  puzzleNumber: 2,
  text: 'Honey bees rub pollen onto each other as a sign of friendship.',
  author: 'Tristan',
  status: 'pending',
  featured: false,
  createdAt: '2026-11-01T17:30:00Z',
  ...over,
})

function setup(api: EditorApi, url = '/moderate.html') {
  window.history.replaceState(null, '', url)
  const user = userEvent.setup()
  render(<Moderate api={api} now={NOW} />)
  return { user }
}

describe('signing in', () => {
  it('asks for email and password when signed out', async () => {
    const { user } = setup(memoryApi({ signedIn: false }))
    await user.type(await screen.findByLabelText('Email'), 'ed@example.com')
    await user.type(screen.getByLabelText('Password'), 'right')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('heading', { name: /Honey bees/ })).toBeInTheDocument()
  })

  it('shows a failed sign-in and keeps the email', async () => {
    const { user } = setup(memoryApi({ signedIn: false }))
    await user.type(await screen.findByLabelText('Email'), 'ed@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('did not match')
    expect(screen.getByLabelText('Email')).toHaveValue('ed@example.com')
  })

  it('tells a signed-in non-editor how to get access', async () => {
    setup(memoryApi({ editor: false }))
    expect(await screen.findByText(/not on the editors list/i)).toBeInTheDocument()
    expect(screen.getByText(/insert into public.editors/)).toBeInTheDocument()
  })

  it('signs out', async () => {
    const { user } = setup(memoryApi())
    await user.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
  })
})

describe('the desk', () => {
  it('opens on tomorrow with the house fib and the day’s submissions', async () => {
    setup(memoryApi({ fibs: [fib({})] }))
    expect(await screen.findByRole('heading', { level: 1, name: /No\. 2.*Honey bees/ })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Running on this day' })).toHaveTextContent(getPuzzle(2).fib.text)
    const list = screen.getByRole('list', { name: 'Submitted fibs' })
    expect(within(list).getByText(/rub pollen/)).toBeInTheDocument()
    expect(within(list).getByText('Tristan')).toBeInTheDocument()
    expect(within(list).getByText('Pending')).toBeInTheDocument()
  })

  it('moves between days and keeps the day in the address', async () => {
    const { user } = setup(memoryApi())
    await screen.findByRole('heading', { level: 1, name: /No\. 2/ })
    await user.click(screen.getByRole('button', { name: 'Next day' }))
    expect(await screen.findByRole('heading', { level: 1, name: new RegExp(`No\\. 3.*${getPuzzle(3).theme}`) })).toBeInTheDocument()
    expect(window.location.search).toBe('?day=3')
    await user.click(screen.getByRole('button', { name: 'Previous day' }))
    await user.click(screen.getByRole('button', { name: 'Previous day' }))
    expect(await screen.findByRole('heading', { level: 1, name: /No\. 1/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous day' })).toBeDisabled()
  })

  it('opens the day named in the address', async () => {
    setup(memoryApi(), '/moderate.html?day=5')
    expect(await screen.findByRole('heading', { level: 1, name: /No\. 5/ })).toBeInTheDocument()
  })

  it('lists days with fibs waiting and jumps to one', async () => {
    const { user } = setup(memoryApi({ fibs: [fib({ id: 'a', puzzleNumber: 6 }), fib({ id: 'b', puzzleNumber: 6 })] }))
    await user.click(await screen.findByRole('link', { name: /No\. 6.*2 waiting/ }))
    expect(await screen.findByRole('heading', { level: 1, name: /No\. 6/ })).toBeInTheDocument()
  })

  it('says so when nobody has sent a fib for the day', async () => {
    setup(memoryApi())
    expect(await screen.findByText('No fibs sent for this day yet.')).toBeInTheDocument()
  })
})

describe('moderating', () => {
  it('runs a fib in place of the house fib', async () => {
    const { user } = setup(memoryApi({ fibs: [fib({})] }))
    await user.click(await screen.findByRole('button', { name: /Run this fib/ }))
    const running = screen.getByRole('region', { name: 'Running on this day' })
    expect(await within(running).findByText(/rub pollen/)).toBeInTheDocument()
    expect(within(running).getByText(/by Tristan/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Running Tristan’s fib on No. 2.')
  })

  it('goes back to the house fib', async () => {
    const { user } = setup(memoryApi({ fibs: [fib({ status: 'approved', featured: true })] }))
    await user.click(await screen.findByRole('button', { name: 'Use the house fib' }))
    expect(await within(screen.getByRole('region', { name: 'Running on this day' })).findByText(getPuzzle(2).fib.text)).toBeInTheDocument()
  })

  it('rejects and restores a fib', async () => {
    const { user } = setup(memoryApi({ fibs: [fib({})] }))
    await user.click(await screen.findByRole('button', { name: /Reject/ }))
    expect(await screen.findByText('Rejected')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Restore/ }))
    expect(await screen.findByText('Pending')).toBeInTheDocument()
  })

  it('shows a refused action without losing the list', async () => {
    const api = memoryApi({ fibs: [fib({})] })
    api.feature = async () => {
      throw new Error('not an editor')
    }
    const { user } = setup(api)
    await user.click(await screen.findByRole('button', { name: /Run this fib/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('not an editor')
    expect(screen.getByText(/rub pollen/)).toBeInTheDocument()
  })

  it('lists pending fibs before decided ones', async () => {
    setup(
      memoryApi({
        fibs: [
          fib({ id: 'old', text: 'An old rejected fib about honey bees.', status: 'rejected' }),
          fib({ id: 'new', text: 'A fresh pending fib about honey bees.', status: 'pending' }),
        ],
      }),
    )
    const items = within(await screen.findByRole('list', { name: 'Submitted fibs' })).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('A fresh pending fib')
  })
})
