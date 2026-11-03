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

  it('records a day of three rounds', async () => {
    const s = fakeSupabase()
    await supabaseBackend(s.client).recordResult({
      puzzleNumber: 2,
      clientId: 'c1',
      picks: [['a', 'b', 'c'], ['fib'], ['d', 'e', 'f']],
      fibsCaught: 2,
      readerCaught: true,
    })
    expect(s.from).toHaveBeenCalledWith('results')
    expect(s.insert).toHaveBeenCalledWith({
      puzzle_number: 2,
      client_id: 'c1',
      picks: ['a', 'b', 'c', 'fib', 'd', 'e', 'f'],
      caught: false,
      fibs_caught: 2,
      reader_caught: true,
    })
  })

  it('marks a perfect day as caught', async () => {
    const s = fakeSupabase()
    await supabaseBackend(s.client).recordResult({ puzzleNumber: 2, clientId: 'c1', picks: [['a'], ['b'], ['c']], fibsCaught: 3, readerCaught: true })
    expect(s.insert).toHaveBeenCalledWith(expect.objectContaining({ caught: true }))
  })

  it('reads stats through the puzzle_stats function', async () => {
    const s = fakeSupabase({ rpc: { puzzle_stats: { data: [{ players: 10, perfect: 4, reader_fooled: 6 }], error: null } } })
    expect(await supabaseBackend(s.client).getStats(2)).toEqual({ players: 10, perfect: 4, readerFooled: 6 })
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
  it('swaps a community fib into round 3 and credits the author, keeping the fib id', () => {
    const p = withFeaturedFib(PUZZLES[0], { text: 'Octopuses can count to ten.', author: 'Lee' })
    expect(p.rounds[2].fib).toMatchObject({ id: PUZZLES[0].rounds[2].fib.id, text: 'Octopuses can count to ten.', author: 'Lee' })
    expect(p.rounds[2].fib.explanation).toMatch(/Lee/)
    expect(p.rounds[2].fib.source).toBeUndefined()
    expect(p.rounds[0]).toBe(PUZZLES[0].rounds[0])
  })

  it('credits anonymous fibs to a player', () => {
    expect(withFeaturedFib(PUZZLES[0], { text: 'Octopuses can count to ten.', author: null }).rounds[2].fib.explanation).toMatch(/a player/i)
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

describe('accounts (supabase)', () => {
  function authClient(over: Record<string, unknown> = {}) {
    const s = fakeSupabase(over as never)
    const auth = {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1', email: 'sam@example.com' } } } }),
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    }
    const order = vi.fn().mockResolvedValue({ data: [{ puzzle_number: 2, fibs_caught: 2, cleared: 7 }], error: null })
    const select = vi.fn(() => ({ not: vi.fn(() => ({ order })) }))
    const from = vi.fn((t: string) => (t === 'results' ? { insert: s.insert, select } : { insert: s.insert }))
    return { client: { ...(s.client as object), auth, from } as never, auth, rpc: s.rpc, insert: s.insert }
  }

  it('reports the signed-in player', async () => {
    const c = authClient()
    expect(await supabaseBackend(c.client).account.current()).toEqual({ id: 'u1', email: 'sam@example.com' })
  })

  it('emails a sign-in link that comes back to the game', async () => {
    const c = authClient()
    expect(await supabaseBackend(c.client).account.sendLink('sam@example.com', 'https://x.test/fibbed/')).toEqual({ ok: true })
    expect(c.auth.signInWithOtp).toHaveBeenCalledWith({ email: 'sam@example.com', options: { emailRedirectTo: 'https://x.test/fibbed/' } })
  })

  it('explains when too many links were asked for', async () => {
    const c = authClient()
    c.auth.signInWithOtp.mockResolvedValue({ error: { status: 429, message: 'email rate limit exceeded' } })
    expect(await supabaseBackend(c.client).account.sendLink('sam@example.com', 'u')).toEqual({
      ok: false,
      error: 'Too many sign-in emails just now. Wait a few minutes and try again.',
    })
  })

  it('loads the player’s history', async () => {
    const c = authClient()
    expect(await supabaseBackend(c.client).account.history()).toEqual([{ puzzleNumber: 2, fibsCaught: 2, cleared: 7 }])
  })

  it('claims this device’s anonymous results', async () => {
    const c = authClient()
    await supabaseBackend(c.client).account.claimDevice('c1')
    expect(c.rpc).toHaveBeenCalledWith('claim_device_results', { device: 'c1' })
  })

  it('records truths cleared with each result', async () => {
    const c = authClient()
    await supabaseBackend(c.client).recordResult({ puzzleNumber: 2, clientId: 'c1', picks: [['a'], ['b'], ['c']], fibsCaught: 1, readerCaught: false, cleared: 2 })
    expect(c.insert).toHaveBeenCalledWith(expect.objectContaining({ cleared: 2 }))
  })

  it('reads today’s score spread', async () => {
    const s = fakeSupabase({ rpc: { score_counts: { data: [{ score: 6, players: 2 }, { score: 12, players: 1 }], error: null } } })
    expect(await supabaseBackend(s.client).getScoreCounts(4)).toEqual({ 6: 2, 12: 1 })
  })
})

describe('getPuzzle', () => {
  it('returns null when the RPC returns an empty array (no approved puzzle)', async () => {
    const s = fakeSupabase({ rpc: { get_approved_puzzle: { data: [], error: null } } })
    expect(await supabaseBackend(s.client).getPuzzle(3)).toBeNull()
  })

  it('returns null when the RPC returns null', async () => {
    const s = fakeSupabase({ rpc: { get_approved_puzzle: { data: null, error: null } } })
    expect(await supabaseBackend(s.client).getPuzzle(3)).toBeNull()
  })
})

describe('accounts (offline)', () => {
  it('cannot sign in without the server', async () => {
    const b = localBackend()
    expect(b.account.available).toBe(false)
    expect(await b.account.current()).toBeNull()
    expect(await b.getScoreCounts(1)).toBeNull()
  })
})
