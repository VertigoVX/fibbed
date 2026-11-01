import { PUZZLES, getPuzzle } from './puzzles'
import { FIB_MAX } from '../lib/fib'

describe('starter puzzles', () => {
  it('has at least two weeks of puzzles numbered from 1', () => {
    expect(PUZZLES.length).toBeGreaterThanOrEqual(14)
    PUZZLES.forEach((p, i) => expect(p.number).toBe(i + 1))
  })

  it.each(PUZZLES.map((p) => [p.number, p] as const))('puzzle %i is well formed', (_n, p) => {
    expect(p.theme.length).toBeGreaterThan(2)
    expect(p.truths).toHaveLength(4)
    for (const t of p.truths) {
      expect(t.source?.url).toMatch(/^https:\/\//)
      expect(t.text).toMatch(/[.!?]$/)
    }
    expect(p.fib.text).toMatch(/[.!?]$/)
    expect(p.fib.text.length).toBeLessThanOrEqual(FIB_MAX)
    expect(p.fib.explanation.length).toBeGreaterThan(20)
    const ids = [...p.truths.map((t) => t.id), p.fib.id]
    expect(new Set(ids).size).toBe(5)
  })

  it.each(PUZZLES.map((p) => [p.number, p] as const))('puzzle %i fib is not given away by its length', (_n, p) => {
    const lengths = p.truths.map((t) => t.text.length)
    expect(p.fib.text.length).toBeGreaterThanOrEqual(Math.min(...lengths) - 20)
    expect(p.fib.text.length).toBeLessThanOrEqual(Math.max(...lengths) + 20)
  })

  it('uses unique ids across the whole set', () => {
    const ids = PUZZLES.flatMap((p) => [...p.truths.map((t) => t.id), p.fib.id])
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('getPuzzle', () => {
  it('returns the puzzle for a number', () => {
    expect(getPuzzle(3).theme).toBe(PUZZLES[2].theme)
  })

  it('cycles the set when the numbers run past it, keeping the real number', () => {
    const p = getPuzzle(PUZZLES.length + 2)
    expect(p.theme).toBe(PUZZLES[1].theme)
    expect(p.number).toBe(PUZZLES.length + 2)
  })
})
