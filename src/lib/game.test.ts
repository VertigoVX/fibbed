import { arrange, initialGame, pick, outcomeOf } from './game'
import type { Puzzle } from './types'

const puzzle: Puzzle = {
  number: 7,
  theme: 'Octopuses',
  truths: [
    { id: 't1', text: 'Truth one' },
    { id: 't2', text: 'Truth two' },
    { id: 't3', text: 'Truth three' },
    { id: 't4', text: 'Truth four' },
  ],
  fib: { id: 'fib', text: 'The fib', explanation: 'Why it is false' },
}

describe('arrange', () => {
  it('returns all five statements exactly once', () => {
    const ids = arrange(puzzle).map((s) => s.id).sort()
    expect(ids).toEqual(['fib', 't1', 't2', 't3', 't4'])
  })

  it('is the same order for every player on the same puzzle', () => {
    expect(arrange(puzzle)).toEqual(arrange({ ...puzzle }))
  })

  it('moves the fib around across puzzles', () => {
    const positions = new Set(
      Array.from({ length: 30 }, (_, i) => arrange({ ...puzzle, number: i + 1 }).findIndex((s) => s.id === 'fib')),
    )
    expect(positions.size).toBeGreaterThanOrEqual(4)
  })
})

describe('pick', () => {
  it('starts in play with no picks', () => {
    expect(initialGame()).toEqual({ picks: [], status: 'playing' })
  })

  it('keeps playing while truths are picked', () => {
    let g = pick(initialGame(), puzzle, 't2')
    g = pick(g, puzzle, 't4')
    expect(g).toEqual({ picks: ['t2', 't4'], status: 'playing' })
  })

  it('ends as fooled when the fib is picked', () => {
    const g = pick(pick(initialGame(), puzzle, 't1'), puzzle, 'fib')
    expect(g.status).toBe('fooled')
    expect(g.picks).toEqual(['t1', 'fib'])
  })

  it('ends as caught once all four truths are cleared', () => {
    let g = initialGame()
    for (const id of ['t3', 't1', 't4', 't2']) g = pick(g, puzzle, id)
    expect(g.status).toBe('caught')
  })

  it('ignores repeat picks, unknown ids and picks after the game ends', () => {
    let g = pick(initialGame(), puzzle, 't1')
    expect(pick(g, puzzle, 't1')).toBe(g)
    expect(pick(g, puzzle, 'nope')).toBe(g)
    g = pick(g, puzzle, 'fib')
    expect(pick(g, puzzle, 't2')).toBe(g)
  })
})

describe('outcomeOf', () => {
  it('counts truths cleared', () => {
    expect(outcomeOf({ picks: ['t1', 't2', 'fib'], status: 'fooled' }, puzzle)).toEqual({ cleared: 2, caught: false })
    expect(outcomeOf({ picks: ['t1', 't2', 't3', 't4'], status: 'caught' }, puzzle)).toEqual({ cleared: 4, caught: true })
  })
})
