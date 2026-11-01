import type { DayOutcome, DayState, Puzzle, Round, RoundState, Statement } from './types'

export const ROUNDS = 3

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

export function arrange(puzzle: Puzzle, roundIndex: number): Statement[] {
  const round = puzzle.rounds[roundIndex]
  const all: Statement[] = [...round.truths.map(({ id, text }) => ({ id, text })), { id: round.fib.id, text: round.fib.text }]
  const rand = mulberry32((puzzle.number * 7 + roundIndex) * 2654435761)
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[all[i], all[j]] = [all[j], all[i]]
  }
  return all
}

const freshRound = (): RoundState => ({ picks: [], status: 'playing' })

export const newDay = (): DayState => ({ rounds: Array.from({ length: ROUNDS }, freshRound) })

/** Pick within one round. */
export function pick(state: RoundState, round: Round, id: string): RoundState {
  if (state.status !== 'playing' || state.picks.includes(id)) return state
  const isFib = id === round.fib.id
  if (!isFib && !round.truths.some((t) => t.id === id)) return state
  const picks = [...state.picks, id]
  if (isFib) return { picks, status: 'fooled' }
  return { picks, status: picks.length === round.truths.length ? 'caught' : 'playing' }
}

/** The round being played, or ROUNDS once the day is done. */
export function currentRound(day: DayState): number {
  const i = day.rounds.findIndex((r) => r.status === 'playing')
  return i === -1 ? ROUNDS : i
}

export function pickInDay(day: DayState, puzzle: Puzzle, id: string): DayState {
  const r = currentRound(day)
  if (r >= ROUNDS) return day
  const next = pick(day.rounds[r], puzzle.rounds[r], id)
  if (next === day.rounds[r]) return day
  return { rounds: day.rounds.map((s, i) => (i === r ? next : s)) }
}

/** Rebuild a day from saved picks, round by round, dropping anything invalid. */
export function replayDay(puzzle: Puzzle, saved: string[][]): DayState {
  let day = newDay()
  if (!Array.isArray(saved)) return day
  for (let r = 0; r < ROUNDS; r++) {
    const picks = Array.isArray(saved[r]) ? saved[r] : []
    for (const id of picks) {
      if (currentRound(day) !== r) break
      day = pickInDay(day, puzzle, id)
    }
  }
  return day
}

export function dayOutcome(day: DayState, puzzle: Puzzle): DayOutcome {
  const rounds = day.rounds.map((s, i) => ({
    cleared: s.picks.filter((id) => id !== puzzle.rounds[i].fib.id).length,
    caught: s.status === 'caught',
  }))
  const fibsCaught = rounds.filter((r) => r.caught).length
  return {
    rounds,
    fibsCaught,
    cleared: rounds.reduce((sum, r) => sum + r.cleared, 0),
    perfect: fibsCaught === ROUNDS,
    done: currentRound(day) === ROUNDS,
  }
}
