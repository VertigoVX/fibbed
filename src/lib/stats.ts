import { ROUNDS } from './game'

export type DayResult = { fibsCaught: number; cleared: number }

export type Stats = {
  played: number
  perfect: number
  /** Consecutive days with at least one fib caught. */
  streak: number
  best: number
  last: number | null
  results: Record<number, DayResult>
}

// v2: three rounds a day. Data from the one-round game is left alone and ignored.
const STATS_KEY = 'fibbed:stats:v2'
const PROGRESS_KEY = 'fibbed:progress:v2'

const empty = (): Stats => ({ played: 0, perfect: 0, streak: 0, best: 0, last: null, results: {} })
const emptyPicks = () => Array.from({ length: ROUNDS }, () => [] as string[])

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode or full storage: the game still works, it just forgets.
  }
}

export function loadStats(): Stats {
  const s = read<Stats>(STATS_KEY)
  return s && typeof s.played === 'number' && typeof s.perfect === 'number' ? { ...empty(), ...s } : empty()
}

export function recordResult(number: number, result: DayResult): Stats {
  const s = loadStats()
  if (s.results[number]) return s
  const scored = result.fibsCaught > 0
  const continues = s.last === number - 1 && (s.results[number - 1]?.fibsCaught ?? 0) > 0
  const streak = scored ? (continues ? s.streak + 1 : 1) : 0
  const next: Stats = {
    played: s.played + 1,
    perfect: s.perfect + (result.fibsCaught === ROUNDS ? 1 : 0),
    streak,
    best: Math.max(s.best, streak),
    last: number,
    results: { ...s.results, [number]: result },
  }
  write(STATS_KEY, next)
  return next
}

export function saveProgress(number: number, picks: string[][]) {
  write(PROGRESS_KEY, { number, picks })
}

export function loadProgress(number: number): string[][] {
  const p = read<{ number: number; picks: string[][] }>(PROGRESS_KEY)
  if (!p || p.number !== number || !Array.isArray(p.picks)) return emptyPicks()
  return emptyPicks().map((_, i) => (Array.isArray(p.picks[i]) ? p.picks[i].filter((x) => typeof x === 'string') : []))
}
