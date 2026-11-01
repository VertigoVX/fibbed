import { arrange, currentRound, dayOutcome, newDay, pick, pickInDay, replayDay, ROUNDS } from './game'
import type { Puzzle, Round } from './types'

const round = (r: number, theme: string): Round => ({
  theme,
  level: (['easy', 'medium', 'hard'] as const)[r],
  truths: [1, 2, 3].map((j) => ({ id: `r${r}t${j}`, text: `Truth ${j}` })),
  fib: { id: `r${r}fib`, text: 'The fib', explanation: 'Why it is false' },
})

const puzzle: Puzzle = { number: 7, rounds: [round(0, 'Cats'), round(1, 'Sharks'), round(2, 'Octopuses')] }
const [r0, r1, r2] = puzzle.rounds

describe('arrange', () => {
  it('returns all four statements exactly once', () => {
    expect(arrange(puzzle, 0).map((s) => s.id).sort()).toEqual(['r0fib', 'r0t1', 'r0t2', 'r0t3'])
  })

  it('is the same order for every player', () => {
    expect(arrange(puzzle, 1)).toEqual(arrange({ ...puzzle }, 1))
  })

  it('moves the fib around across days and rounds', () => {
    const positions = new Set<number>()
    for (let n = 1; n <= 20; n++)
      for (let r = 0; r < 3; r++) positions.add(arrange({ ...puzzle, number: n }, r).findIndex((s) => s.id.endsWith('fib')))
    expect(positions.size).toBe(4)
  })
})

describe('pick (one round)', () => {
  const start = { picks: [], status: 'playing' as const }

  it('keeps playing while truths are picked', () => {
    expect(pick(pick(start, r0, 'r0t2'), r0, 'r0t1')).toEqual({ picks: ['r0t2', 'r0t1'], status: 'playing' })
  })

  it('ends as fooled when the fib is picked', () => {
    expect(pick(start, r0, 'r0fib')).toEqual({ picks: ['r0fib'], status: 'fooled' })
  })

  it('ends as caught once all three truths are cleared', () => {
    let g = start as ReturnType<typeof pick>
    for (const id of ['r0t3', 'r0t1', 'r0t2']) g = pick(g, r0, id)
    expect(g.status).toBe('caught')
  })

  it('ignores repeats, other rounds’ ids and picks after the round ends', () => {
    const g = pick(start, r0, 'r0t1')
    expect(pick(g, r0, 'r0t1')).toBe(g)
    expect(pick(g, r0, 'r1t1')).toBe(g)
    const done = pick(g, r0, 'r0fib')
    expect(pick(done, r0, 'r0t2')).toBe(done)
  })
})

describe('a day of rounds', () => {
  it('has three rounds', () => {
    expect(ROUNDS).toBe(3)
    expect(newDay().rounds).toHaveLength(3)
  })

  it('plays the rounds in order', () => {
    let d = newDay()
    expect(currentRound(d)).toBe(0)
    d = pickInDay(d, puzzle, 'r0fib')
    expect(currentRound(d)).toBe(1)
    d = pickInDay(d, puzzle, 'r0t1') // a round-1 id now does nothing
    expect(d.rounds[1].picks).toEqual([])
    for (const id of ['r1t1', 'r1t2', 'r1t3']) d = pickInDay(d, puzzle, id)
    expect(currentRound(d)).toBe(2)
    d = pickInDay(d, puzzle, 'r2t1')
    d = pickInDay(d, puzzle, 'r2fib')
    expect(currentRound(d)).toBe(3)
  })

  it('totals the outcome', () => {
    let d = newDay()
    for (const id of ['r0t1', 'r0t2', 'r0t3', 'r1t1', 'r1fib', 'r2t3', 'r2t1', 'r2t2']) d = pickInDay(d, puzzle, id)
    expect(dayOutcome(d, puzzle)).toEqual({
      rounds: [
        { cleared: 3, caught: true },
        { cleared: 1, caught: false },
        { cleared: 3, caught: true },
      ],
      fibsCaught: 2,
      cleared: 7,
      perfect: false,
      done: true,
    })
  })

  it('marks a perfect day', () => {
    let d = newDay()
    for (const r of [r0, r1, r2]) for (const t of r.truths) d = pickInDay(d, puzzle, t.id)
    expect(dayOutcome(d, puzzle)).toMatchObject({ fibsCaught: 3, perfect: true, done: true })
  })

  it('rebuilds a day from saved picks, dropping anything invalid', () => {
    const d = replayDay(puzzle, [['r0t1', 'bogus', 'r0fib'], ['r1t2'], []])
    expect(d.rounds[0]).toEqual({ picks: ['r0t1', 'r0fib'], status: 'fooled' })
    expect(d.rounds[1]).toEqual({ picks: ['r1t2'], status: 'playing' })
    expect(currentRound(d)).toBe(1)
  })

  it('cannot start a later round before an earlier one is finished', () => {
    const d = replayDay(puzzle, [[], ['r1t1'], []])
    expect(d.rounds[1].picks).toEqual([])
  })

  it('copes with saved data of the wrong shape', () => {
    expect(replayDay(puzzle, null as never)).toEqual(newDay())
  })
})
