import type { Outcome } from './types'

export type Stats = {
  played: number
  caught: number
  streak: number
  best: number
  last: number | null
  results: Record<number, Outcome>
}

const STATS_KEY = 'fibbed:stats'
const PROGRESS_KEY = 'fibbed:progress'

const empty = (): Stats => ({ played: 0, caught: 0, streak: 0, best: 0, last: null, results: {} })

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
  return s && typeof s.played === 'number' ? { ...empty(), ...s } : empty()
}

export function recordResult(number: number, outcome: Outcome): Stats {
  const s = loadStats()
  if (s.results[number]) return s
  const continues = s.last === number - 1 && s.results[number - 1]?.caught
  const streak = outcome.caught ? (continues ? s.streak + 1 : 1) : 0
  const next: Stats = {
    played: s.played + 1,
    caught: s.caught + (outcome.caught ? 1 : 0),
    streak,
    best: Math.max(s.best, streak),
    last: number,
    results: { ...s.results, [number]: outcome },
  }
  write(STATS_KEY, next)
  return next
}

export function saveProgress(number: number, picks: string[]) {
  write(PROGRESS_KEY, { number, picks })
}

export function loadProgress(number: number): string[] {
  const p = read<{ number: number; picks: string[] }>(PROGRESS_KEY)
  return p && p.number === number && Array.isArray(p.picks) ? p.picks : []
}
