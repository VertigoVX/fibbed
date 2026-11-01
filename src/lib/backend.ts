import type { SupabaseClient } from '@supabase/supabase-js'
import type { Puzzle } from './types'

export type SubmitResult = { ok: true } | { ok: false; error: string }
export type PuzzleStats = { players: number; caught: number }
export type FeaturedFib = { text: string; author: string | null }

export interface Backend {
  submitFib(input: { puzzleNumber: number; text: string; author: string; clientId: string }): Promise<SubmitResult>
  recordResult(input: { puzzleNumber: number; clientId: string; picks: string[]; caught: boolean }): Promise<void>
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
    async recordResult({ puzzleNumber, clientId, picks, caught }) {
      try {
        await client.from('results').insert({ puzzle_number: puzzleNumber, client_id: clientId, picks, caught })
      } catch {
        /* stats are best effort */
      }
    },
    async getStats(n) {
      const { data, error } = await client.rpc('puzzle_stats', { n })
      if (error) return null
      const row = firstRow<PuzzleStats>(data)
      return row ? { players: Number(row.players), caught: Number(row.caught) } : null
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

export function withFeaturedFib(puzzle: Puzzle, featured: FeaturedFib | null): Puzzle {
  if (!featured) return puzzle
  const by = featured.author ? featured.author : 'a player'
  return {
    ...puzzle,
    fib: {
      id: puzzle.fib.id,
      text: featured.text,
      author: featured.author ?? undefined,
      explanation: `Invented by ${by}, who wrote it after yesterday’s puzzle.`,
    },
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
