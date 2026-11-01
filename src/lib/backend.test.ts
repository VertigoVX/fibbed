import { vi } from 'vitest'
import { localBackend, supabaseBackend, withFeaturedFib, clientId } from './backend'
import { PUZZLES } from '../data/puzzles'

function fakeSupabase(overrides: { insert?: unknown; rpc?: Record<string, unknown> } = {}) {
  const insert = vi.fn().mockResolvedValue(overrides.insert ?? { error: null })
  const from = vi.fn(() => ({ insert }))
  const rpc = vi.fn((name: string) => Promise.resolve(overrides.rpc?.[name] ?? { data: null, error: null }))
  return { client: { from, rpc } as never, from, insert, rpc }
}

describe('supabaseBackend', () => {
  it('submits a fib as pending for the given puzzle', async () => {
    const s = fakeSupabase()
    const r = await supabaseBackend(s.client).submitFib({ puzzleNumber: 4, text: 'A fib', author: 'Sam', clientId: 'c1' })
    expect(r).toEqual({ ok: true })
    expect(s.from).toHaveBeenCalledWith('fibs')
    expect(s.insert).toHaveBeenCalledWith({ puzzle_number: 4, text: 'A fib', author: 'Sam', client_id: 'c1' })
  })

  it('sends an empty author as null', async () => {
    const s = fakeSupabase()
    await supabaseBackend(s.client).submitFib({ puzzleNumber: 4, text: 'A fib', author: '', clientId: 'c1' })
    expect(s.insert).toHaveBeenCalledWith(expect.objectContaining({ author: null }))
  })

  it('explains a duplicate submission', async () => {
    const s = fakeSupabase({ insert: { error: { code: '23505', message: 'duplicate' } } })
    const r = await supabaseBackend(s.client).submitFib({ puzzleNumber: 4, text: 'A fib', author: '', clientId: 'c1' })
    expect(r).toEqual({ ok: false, error: 'You have already sent a fib for this day.' })
  })

  it('reports other failures without throwing', async () => {
    const s = fakeSupabase({ insert: { error: { code: '500', message: 'boom' } } })
    const r = await supabaseBackend(s.client).submitFib({ puzzleNumber: 4, text: 'A fib', author: '', clientId: 'c1' })
    expect(r).toEqual({ ok: false, error: 'Could not send your fib. Try again in a moment.' })
  })

  it('records a result', async () => {
    const s = fakeSupabase()
    await supabaseBackend(s.client).recordResult({ puzzleNumber: 2, clientId: 'c1', picks: ['a', 'b'], caught: false })
    expect(s.from).toHaveBeenCalledWith('results')
    expect(s.insert).toHaveBeenCalledWith({ puzzle_number: 2, client_id: 'c1', picks: ['a', 'b'], caught: false })
  })

  it('reads stats through the puzzle_stats function', async () => {
    const s = fakeSupabase({ rpc: { puzzle_stats: { data: [{ players: 10, caught: 4 }], error: null } } })
    expect(await supabaseBackend(s.client).getStats(2)).toEqual({ players: 10, caught: 4 })
    expect(s.rpc).toHaveBeenCalledWith('puzzle_stats', { n: 2 })
  })

  it('returns null stats on error', async () => {
    const s = fakeSupabase({ rpc: { puzzle_stats: { data: null, error: { message: 'x' } } } })
    expect(await supabaseBackend(s.client).getStats(2)).toBeNull()
  })

  it('reads the featured fib', async () => {
    const s = fakeSupabase({ rpc: { featured_fib: { data: [{ text: 'Made up', author: 'Lee' }], error: null } } })
    expect(await supabaseBackend(s.client).getFeaturedFib(3)).toEqual({ text: 'Made up', author: 'Lee' })
  })

  it('returns no featured fib when there is none', async () => {
    const s = fakeSupabase({ rpc: { featured_fib: { data: [], error: null } } })
    expect(await supabaseBackend(s.client).getFeaturedFib(3)).toBeNull()
  })
})

describe('localBackend', () => {
  it('accepts one fib per day and keeps it on the device', async () => {
    const b = localBackend()
    expect(await b.submitFib({ puzzleNumber: 5, text: 'A fib', author: '', clientId: 'c' })).toEqual({ ok: true })
    expect(await b.submitFib({ puzzleNumber: 5, text: 'Another', author: '', clientId: 'c' })).toMatchObject({ ok: false })
    expect(await b.getSubmittedFib(5)).toBe('A fib')
  })

  it('has no shared stats or featured fibs', async () => {
    const b = localBackend()
    expect(await b.getStats(1)).toBeNull()
    expect(await b.getFeaturedFib(1)).toBeNull()
  })
})

describe('withFeaturedFib', () => {
  it('swaps in a community fib and credits the author, keeping the fib id', () => {
    const p = withFeaturedFib(PUZZLES[0], { text: 'Octopuses can count to ten.', author: 'Lee' })
    expect(p.fib).toMatchObject({ id: PUZZLES[0].fib.id, text: 'Octopuses can count to ten.', author: 'Lee' })
    expect(p.fib.explanation).toMatch(/Lee/)
    expect(p.fib.source).toBeUndefined()
  })

  it('credits anonymous fibs to a player', () => {
    expect(withFeaturedFib(PUZZLES[0], { text: 'Octopuses can count to ten.', author: null }).fib.explanation).toMatch(/a player/i)
  })

  it('leaves the puzzle alone without a featured fib', () => {
    expect(withFeaturedFib(PUZZLES[0], null)).toBe(PUZZLES[0])
  })
})

describe('clientId', () => {
  it('is stable on a device', () => {
    expect(clientId()).toBe(clientId())
    expect(clientId()).toMatch(/^[0-9a-f-]{36}$/)
  })
})
