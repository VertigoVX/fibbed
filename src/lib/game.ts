import type { GameState, Outcome, Puzzle, Statement } from './types'

/** Small deterministic PRNG so every player sees the same order. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function arrange(puzzle: Puzzle): Statement[] {
  const all: Statement[] = [
    ...puzzle.truths.map(({ id, text }) => ({ id, text })),
    { id: puzzle.fib.id, text: puzzle.fib.text },
  ]
  const rand = mulberry32(puzzle.number * 2654435761)
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[all[i], all[j]] = [all[j], all[i]]
  }
  return all
}

export const initialGame = (): GameState => ({ picks: [], status: 'playing' })

export function pick(state: GameState, puzzle: Puzzle, id: string): GameState {
  if (state.status !== 'playing' || state.picks.includes(id)) return state
  const isFib = id === puzzle.fib.id
  if (!isFib && !puzzle.truths.some((t) => t.id === id)) return state
  const picks = [...state.picks, id]
  if (isFib) return { picks, status: 'fooled' }
  return { picks, status: picks.length === puzzle.truths.length ? 'caught' : 'playing' }
}

/** Rebuild a game from saved picks, dropping anything invalid. */
export function replay(puzzle: Puzzle, picks: string[]): GameState {
  return picks.reduce((g, id) => pick(g, puzzle, id), initialGame())
}

export function outcomeOf(state: GameState, puzzle: Puzzle): Outcome {
  const cleared = state.picks.filter((id) => id !== puzzle.fib.id).length
  return { cleared, caught: state.status === 'caught' }
}
