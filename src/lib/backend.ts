import type { SupabaseClient } from '@supabase/supabase-js'
import type { Puzzle } from './types'

export type SubmitResult = { ok: true } | { ok: false; error: string }
export type PuzzleStats = { players: number; perfect: number; readerFooled: number }
export type FeaturedFib = { text: string; author: string | null }

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
  }): Promise<void>
  getStats(puzzleNumber: number): Promise<PuzzleStats | null>
  getFeaturedFib(puzzleNumber: number): Promise<FeaturedFib | null>
  /** The fib this device sent for a day, if any. */
  getSubmittedFib(puzzleNumber: number): Promise<string | null>
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
    async recordResult({ puzzleNumber, clientId, picks, fibsCaught, readerCaught }) {
      try {
        await client.from('results').insert({
          puzzle_number: puzzleNumber,
          client_id: clientId,
          picks: picks.flat(),
          caught: fibsCaught === picks.length,
          fibs_caught: fibsCaught,
          reader_caught: readerCaught,
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
    async getFeaturedFib(n) {
      const { data, error } = await client.rpc('featured_fib', { n })
      if (error) return null
      const row = firstRow<FeaturedFib>(data)
      return row ? { text: row.text, author: row.author ?? null } : null
    },
    async getSubmittedFib(n) {
      return sentFibs()[n] ?? null
    },
  }
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
    async getFeaturedFib() {
      return null
    },
    async getSubmittedFib(n) {
      return sentFibs()[n] ?? null
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
  return supabaseBackend(createClient(url, key, { auth: { persistSession: false } }))
}
