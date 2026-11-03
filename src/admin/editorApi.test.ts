import { vi } from 'vitest'
import { supabaseEditorApi } from './editorApi'

function fake(opts: { rpc?: Record<string, unknown>; rows?: unknown; signIn?: unknown; session?: unknown } = {}) {
  const order = vi.fn().mockResolvedValue(opts.rows ?? { data: [], error: null })
  const neq = vi.fn(() => ({ order }))
  const eq = vi.fn(() => ({ order }))
  const select = vi.fn(() => ({ eq, neq }))
  const from = vi.fn(() => ({ select }))
  const rpc = vi.fn((name: string) => Promise.resolve(opts.rpc?.[name] ?? { data: null, error: null }))
  const auth = {
    signInWithPassword: vi.fn().mockResolvedValue(opts.signIn ?? { data: {}, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    getSession: vi.fn().mockResolvedValue(opts.session ?? { data: { session: null } }),
  }
  return { client: { from, rpc, auth } as never, from, select, eq, neq, order, rpc, auth }
}

describe('supabaseEditorApi', () => {
  it('reports the signed-in email', async () => {
    const f = fake({ session: { data: { session: { user: { email: 'ed@example.com' } } } } })
    expect(await supabaseEditorApi(f.client).session()).toEqual({ email: 'ed@example.com' })
    expect(await supabaseEditorApi(fake().client).session()).toBeNull()
  })

  it('signs in with email and password', async () => {
    const f = fake()
    expect(await supabaseEditorApi(f.client).signIn('ed@example.com', 'pw')).toEqual({ ok: true })
    expect(f.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'ed@example.com', password: 'pw' })
  })

  it('explains a failed sign-in', async () => {
    const f = fake({ signIn: { data: {}, error: { message: 'Invalid login credentials' } } })
    expect(await supabaseEditorApi(f.client).signIn('ed@example.com', 'bad')).toEqual({
      ok: false,
      error: 'That email and password did not match an account.',
    })
  })

  it('asks the database whether the user is an editor', async () => {
    const f = fake({ rpc: { is_editor: { data: true, error: null } } })
    expect(await supabaseEditorApi(f.client).isEditor()).toBe(true)
  })

  it('maps day counts by puzzle number', async () => {
    const f = fake({ rpc: { fib_counts: { data: [{ puzzle_number: 4, pending: 2, total: 3 }], error: null } } })
    expect(await supabaseEditorApi(f.client).counts()).toEqual({ 4: { pending: 2, total: 3 } })
  })

  it('loads a day’s fibs, oldest first, in app shape', async () => {
    const f = fake({
      rows: {
        data: [
          { id: 'f1', puzzle_number: 4, text: 'Bees hum in C.', author: null, status: 'pending', featured: false, created_at: '2026-11-01T18:00:00Z' },
        ],
        error: null,
      },
    })
    expect(await supabaseEditorApi(f.client).fibs(4)).toEqual([
      { id: 'f1', puzzleNumber: 4, text: 'Bees hum in C.', author: null, status: 'pending', featured: false, createdAt: '2026-11-01T18:00:00Z' },
    ])
    expect(f.from).toHaveBeenCalledWith('fibs')
    expect(f.eq).toHaveBeenCalledWith('puzzle_number', 4)
    expect(f.order).toHaveBeenCalledWith('created_at', { ascending: true })
  })

  it('throws a readable error when loading fails', async () => {
    const f = fake({ rows: { data: null, error: { message: 'boom' } } })
    await expect(supabaseEditorApi(f.client).fibs(4)).rejects.toThrow('Could not load fibs. boom')
  })

  it('runs moderation through the database functions', async () => {
    const f = fake()
    const api = supabaseEditorApi(f.client)
    await api.feature('f1')
    await api.setStatus('f2', 'rejected')
    await api.useHouseFib(4)
    expect(f.rpc).toHaveBeenCalledWith('feature_fib', { fib_id: 'f1' })
    expect(f.rpc).toHaveBeenCalledWith('set_fib_status', { fib_id: 'f2', new_status: 'rejected' })
    expect(f.rpc).toHaveBeenCalledWith('use_house_fib', { n: 4 })
  })

  it('throws when a moderation call is refused', async () => {
    const f = fake({ rpc: { feature_fib: { data: null, error: { message: 'not an editor' } } } })
    await expect(supabaseEditorApi(f.client).feature('f1')).rejects.toThrow(/not an editor/)
  })

  it('loads all non-rejected drafts, newest first', async () => {
    const rounds = [{ theme: 'Penguins' }]
    const f = fake({
      rows: {
        data: [
          { id: 'd1', rounds, status: 'pending', puzzle_number: null, generated_at: '2026-11-03T00:00:00Z', notes: null },
        ],
        error: null,
      },
    })
    expect(await supabaseEditorApi(f.client).drafts()).toEqual([
      { id: 'd1', rounds, status: 'pending', puzzleNumber: null, generatedAt: '2026-11-03T00:00:00Z', notes: null },
    ])
    expect(f.from).toHaveBeenCalledWith('puzzle_drafts')
    expect(f.order).toHaveBeenCalledWith('generated_at', { ascending: false })
  })

  it('calls approve_draft and reject_draft via rpc', async () => {
    const f = fake({ rpc: { approve_draft: { data: 5, error: null }, reject_draft: { data: null, error: null } } })
    const api = supabaseEditorApi(f.client)
    expect(await api.approveDraft('d1')).toBe(5)
    await api.rejectDraft('d2')
    expect(f.rpc).toHaveBeenCalledWith('approve_draft', { draft_id: 'd1' })
    expect(f.rpc).toHaveBeenCalledWith('reject_draft', { draft_id: 'd2' })
  })
})
