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
}

export type Puzzle = {
  number: number
  theme: string
  truths: [Truth, Truth, Truth, Truth] | Truth[]
  fib: Fib
}

export type Statement = { id: string; text: string }

export type GameStatus = 'playing' | 'caught' | 'fooled'

export type GameState = { picks: string[]; status: GameStatus }

export type Outcome = { cleared: number; caught: boolean }
