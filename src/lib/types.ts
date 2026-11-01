export type Source = { label: string; url: string }

export type Truth = { id: string; text: string; source?: Source }

export type Fib = {
  id: string
  text: string
  /** Why it is false, shown after the reveal. */
  explanation: string
  source?: Source
  /** Handle of the player who wrote it, when it came from the community. */
  author?: string
  /** True when a reader wrote it (round 3 only). */
  fromReader?: boolean
}

export type Level = 'easy' | 'medium' | 'hard'

/** One round: three truths and one fib on a theme. */
export type Round = {
  theme: string
  level: Level
  truths: Truth[]
  fib: Fib
}

/** A day's paper: three rounds, easy to hard. Round 3 carries the reader fib. */
export type Puzzle = {
  number: number
  rounds: Round[]
}

export type Statement = { id: string; text: string }

export type GameStatus = 'playing' | 'caught' | 'fooled'

export type RoundState = { picks: string[]; status: GameStatus }

export type DayState = { rounds: RoundState[] }

export type RoundOutcome = { cleared: number; caught: boolean }

export type DayOutcome = {
  rounds: RoundOutcome[]
  fibsCaught: number
  cleared: number
  perfect: boolean
  done: boolean
}
