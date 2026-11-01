import type { SupabaseClient } from '@supabase/supabase-js'

export type FibStatus = 'pending' | 'approved' | 'rejected'

export type EditorFib = {
  id: string
  puzzleNumber: number
  text: string
  author: string | null
  status: FibStatus
  featured: boolean
  createdAt: string
}

export type DayCounts = Record<number, { pending: number; total: number }>

export interface EditorApi {
  session(): Promise<{ email: string } | null>
  signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }>
  signOut(): Promise<void>
  isEditor(): Promise<boolean>
  counts(): Promise<DayCounts>
  fibs(puzzleNumber: number): Promise<EditorFib[]>
  feature(id: string): Promise<void>
  setStatus(id: string, status: FibStatus): Promise<void>
  useHouseFib(puzzleNumber: number): Promise<void>
}

type Row = {
  id: string
  puzzle_number: number
  text: string
  author: string | null
  status: FibStatus
  featured: boolean
  created_at: string
}

export function supabaseEditorApi(client: SupabaseClient): EditorApi {
  async function call(name: string, args?: Record<string, unknown>) {
    const { data, error } = await client.rpc(name, args)
    if (error) throw new Error(error.message)
    return data
  }

  return {
    async session() {
      const { data } = await client.auth.getSession()
      const email = data.session?.user?.email
      return email ? { email } : null
    },
    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email, password })
      if (!error) return { ok: true }
      return {
        ok: false,
        error: /invalid login/i.test(error.message)
          ? 'That email and password did not match an account.'
          : `Could not sign in. ${error.message}`,
      }
    },
    async signOut() {
      await client.auth.signOut()
    },
    async isEditor() {
      return (await call('is_editor')) === true
    },
    async counts() {
      const rows = ((await call('fib_counts')) ?? []) as { puzzle_number: number; pending: number; total: number }[]
      return Object.fromEntries(rows.map((r) => [r.puzzle_number, { pending: Number(r.pending), total: Number(r.total) }]))
    },
    async fibs(n) {
      const { data, error } = await client
        .from('fibs')
        .select('id, puzzle_number, text, author, status, featured, created_at')
        .eq('puzzle_number', n)
        .order('created_at', { ascending: true })
      if (error) throw new Error(`Could not load fibs. ${error.message}`)
      return ((data ?? []) as Row[]).map((r) => ({
        id: r.id,
        puzzleNumber: r.puzzle_number,
        text: r.text,
        author: r.author,
        status: r.status,
        featured: r.featured,
        createdAt: r.created_at,
      }))
    },
    async feature(id) {
      await call('feature_fib', { fib_id: id })
    },
    async setStatus(id, status) {
      await call('set_fib_status', { fib_id: id, new_status: status })
    },
    async useHouseFib(n) {
      await call('use_house_fib', { n })
    },
  }
}
