import type { SupabaseClient } from '@supabase/supabase-js'
import type { Level, Puzzle, Round } from './types'
import type { HistoryEntry } from './stats'

export type SubmitResult = { ok: true } | { ok: false; error: string }
export type PuzzleStats = { players: number; perfect: number; readerFooled: number }
export type FeaturedFib = { text: string; author: string | null }
export type Player = { id: string; email: string }
export type ScoreCounts = Record<number, number>

export interface Account {
  /** False when the game runs without its server. */
  available: boolean
  current(): Promise<Player | null>
  sendLink(email: string, returnTo: string): Promise<SubmitResult>
  signOut(): Promise<void>
  onChange(cb: (player: Player | null) => void): () => void
  history(): Promise<HistoryEntry[]>
  claimDevice(clientId: string): Promise<void>
}

export interface Backend {
  /** True when fibs and results reach the shared server. */
  online: boolean
  submitFib(input: { puzzleNumber: number; text: string; author: string; clientId: string }): Promise<SubmitResult>
  recordResult(input: {
    puzzleNumber: number
    clientId: string
    /** Picks per round. */
    picks: string[][]
    fibsCaught: number
    /** Whether the player caught the round-3 (reader) fib. */
    readerCaught: boolean
    /** Truths cleared across the day, 0 to 9. */
    cleared?: number
  }): Promise<void>
  getStats(puzzleNumber: number): Promise<PuzzleStats | null>
  /** How many players got each score today (truths cleared + fibs caught). */
  getScoreCounts(puzzleNumber: number): Promise<ScoreCounts | null>
  account: Account
  getFeaturedFib(puzzleNumber: number): Promise<FeaturedFib | null>
  /** The fib this device sent for a day, if any. */
  getSubmittedFib(puzzleNumber: number): Promise<string | null>
  /** Returns an AI-generated puzzle approved by an editor, or null (use static fallback). */
  getPuzzle(number: number): Promise<Puzzle | null>
}

const SENT_KEY = 'fibbed:sent'

function sentFibs(): Record<number, string> {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function rememberSent(n: number, text: string) {
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify({ ...sentFibs(), [n]: text }))
  } catch {
    /* storage unavailable */
  }
}

const firstRow = <T,>(data: unknown): T | null => (Array.isArray(data) ? (data[0] ?? null) : ((data as T) ?? null))

type DraftTruth = { text: string; source_url: string; source_label: string }
type DraftFib = { text: string; explanation: string; source_url: string; source_label: string }
type DraftRound = { theme: string; level: Level; truths: DraftTruth[]; fib: DraftFib }

function parsePuzzle(number: number, draftRounds: DraftRound[]): Puzzle {
  const prefix = `p${number}`
  const rounds: Round[] = draftRounds.map((dr, r) => ({
    theme: dr.theme,
    level: dr.level,
    truths: dr.truths.map((t, j) => ({
      id: `${prefix}-r${r + 1}-t${j + 1}`,
      text: t.text,
      source: { label: t.source_label, url: t.source_url },
    })),
    fib: {
      id: `${prefix}-r${r + 1}-fib`,
      text: dr.fib.text,
      explanation: dr.fib.explanation,
      source: { label: dr.fib.source_label, url: dr.fib.source_url },
    },
  }))
  return { number, rounds }
}

export function supabaseBackend(client: SupabaseClient): Backend {
  return {
    online: true,
    async submitFib({ puzzleNumber, text, author, clientId }) {
      const { error } = await client
        .from('fibs')
        .insert({ puzzle_number: puzzleNumber, text, author: author || null, client_id: clientId })
      if (!error) {
        rememberSent(puzzleNumber, text)
        return { ok: true }
      }
      if (error.code === '23505') return { ok: false, error: 'You have already sent a fib for this day.' }
      return { ok: false, error: 'Could not send your fib. Try again in a moment.' }
    },
    async recordResult({ puzzleNumber, clientId, picks, fibsCaught, readerCaught, cleared }) {
      try {
        await client.from('results').insert({
          puzzle_number: puzzleNumber,
          client_id: clientId,
          picks: picks.flat(),
          caught: fibsCaught === picks.length,
          fibs_caught: fibsCaught,
          reader_caught: readerCaught,
          ...(cleared === undefined ? {} : { cleared }),
        })
      } catch {
        /* stats are best effort */
      }
    },
    async getStats(n) {
      const { data, error } = await client.rpc('puzzle_stats', { n })
      if (error) return null
      const row = firstRow<{ players: number; perfect: number; reader_fooled: number }>(data)
      return row ? { players: Number(row.players), perfect: Number(row.perfect), readerFooled: Number(row.reader_fooled) } : null
    },
    async getScoreCounts(n) {
      const { data, error } = await client.rpc('score_counts', { n })
      if (error || !Array.isArray(data)) return null
      return Object.fromEntries((data as { score: number; players: number }[]).map((r) => [Number(r.score), Number(r.players)]))
    },
    account: supabaseAccount(client),
    async getFeaturedFib(n) {
      const { data, error } = await client.rpc('featured_fib', { n })
      if (error) return null
      const row = firstRow<FeaturedFib>(data)
      return row ? { text: row.text, author: row.author ?? null } : null
    },
    async getSubmittedFib(n) {
      return sentFibs()[n] ?? null
    },
    async getPuzzle(n) {
      const { data, error } = await client.rpc('get_approved_puzzle', { n })
      if (error || !Array.isArray(data) || data.length === 0) return null
      return parsePuzzle(n, data as DraftRound[])
    },
  }
}

function supabaseAccount(client: SupabaseClient): Account {
  const toPlayer = (u: { id: string; email?: string } | null | undefined): Player | null =>
    u ? { id: u.id, email: u.email ?? '' } : null
  return {
    available: true,
    async current() {
      const { data } = await client.auth.getSession()
      return toPlayer(data.session?.user)
    },
    async sendLink(email, returnTo) {
      const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: returnTo } })
      if (!error) return { ok: true }
      if (error.status === 429 || /rate limit/i.test(error.message))
        return { ok: false, error: 'Too many sign-in emails just now. Wait a few minutes and try again.' }
      return { ok: false, error: 'Could not send the sign-in email. Check the address and try again.' }
    },
    async signOut() {
      await client.auth.signOut()
    },
    onChange(cb) {
      const { data } = client.auth.onAuthStateChange((_event, session) => cb(toPlayer(session?.user)))
      return () => data.subscription.unsubscribe()
    },
    async history() {
      const { data, error } = await client
        .from('results')
        .select('puzzle_number, fibs_caught, cleared')
        .not('fibs_caught', 'is', null)
        .order('puzzle_number', { ascending: true })
      if (error || !data) return []
      return (data as { puzzle_number: number; fibs_caught: number; cleared: number | null }[]).map((r) => ({
        puzzleNumber: r.puzzle_number,
        fibsCaught: r.fibs_caught,
        cleared: r.cleared ?? 0,
      }))
    },
    async claimDevice(clientId) {
      await client.rpc('claim_device_results', { device: clientId })
    },
  }
}

const noAccount: Account = {
  available: false,
  current: async () => null,
  sendLink: async () => ({ ok: false, error: 'Accounts need the game’s server, which is not switched on.' }),
  signOut: async () => {},
  onChange: () => () => {},
  history: async () => [],
  claimDevice: async () => {},
}

/** Used when Supabase is not configured: everything stays on the device. */
export function localBackend(): Backend {
  return {
    online: false,
    async submitFib({ puzzleNumber, text }) {
      if (sentFibs()[puzzleNumber]) return { ok: false, error: 'You have already sent a fib for this day.' }
      rememberSent(puzzleNumber, text)
      return { ok: true }
    },
    async recordResult() {},
    async getStats() {
      return null
    },
    async getScoreCounts() {
      return null
    },
    account: noAccount,
    async getFeaturedFib() {
      return null
    },
    async getSubmittedFib(n) {
      return sentFibs()[n] ?? null
    },
    async getPuzzle() {
      return null
    },
  }
}

/** A featured community fib takes over round 3, the reader round. */
export function withFeaturedFib(puzzle: Puzzle, featured: FeaturedFib | null): Puzzle {
  if (!featured) return puzzle
  const by = featured.author ? featured.author : 'a player'
  const reader = puzzle.rounds[2]
  return {
    ...puzzle,
    rounds: [
      ...puzzle.rounds.slice(0, 2),
      {
        ...reader,
        fib: {
          id: reader.fib.id,
          text: featured.text,
          author: featured.author ?? undefined,
          fromReader: true,
          explanation: `Invented by ${by}, who wrote it after yesterday’s paper.`,
        },
      },
    ],
  }
}

const ID_KEY = 'fibbed:client'

export function clientId(): string {
  try {
    const existing = localStorage.getItem(ID_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(ID_KEY, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

export async function createBackend(): Promise<Backend> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !key) return localBackend()
  const { createClient } = await import('@supabase/supabase-js')
  return supabaseBackend(
    createClient(url, key, { auth: { storageKey: 'fibbed-player', persistSession: true, detectSessionInUrl: true } }),
  )
}
