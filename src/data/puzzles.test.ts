import { PUZZLES, getPuzzle } from './puzzles'
import { FIB_MAX } from '../lib/fib'

const rounds = PUZZLES.flatMap((p) => p.rounds.map((r, i) => [`${p.number}.${i + 1} ${r.theme}`, r] as const))

describe('starter puzzles', () => {
  it('has at least two weeks of days numbered from 1', () => {
    expect(PUZZLES.length).toBeGreaterThanOrEqual(14)
    PUZZLES.forEach((p, i) => expect(p.number).toBe(i + 1))
  })

  it('gives every day three rounds, easy to hard', () => {
    for (const p of PUZZLES) expect(p.rounds.map((r) => r.level)).toEqual(['easy', 'medium', 'hard'])
  })

  it('keeps the themes that player fibs were already written for in round 3', () => {
    expect(getPuzzle(2).rounds[2].theme).toBe('Honey bees')
  })

  it('never repeats a theme', () => {
    const themes = PUZZLES.flatMap((p) => p.rounds.map((r) => r.theme))
    expect(new Set(themes).size).toBe(themes.length)
  })

  it.each(rounds)('round %s is well formed', (_name, r) => {
    expect(r.truths).toHaveLength(3)
    for (const t of r.truths) {
      expect(t.source?.url).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//)
      expect(t.text).toMatch(/[.!?]$/)
    }
    expect(r.fib.text).toMatch(/[.!?]$/)
    expect(r.fib.text.length).toBeLessThanOrEqual(FIB_MAX)
    expect(r.fib.explanation.length).toBeGreaterThan(20)
    expect(r.fib.source?.url).toMatch(/^https:\/\//)
  })

  it.each(rounds)('round %s does not give the fib away by its length', (_name, r) => {
    const lengths = r.truths.map((t) => t.text.length)
    expect(r.fib.text.length).toBeGreaterThanOrEqual(Math.min(...lengths) - 20)
    expect(r.fib.text.length).toBeLessThanOrEqual(Math.max(...lengths) + 20)
  })

  it('uses unique ids across the whole set', () => {
    const ids = PUZZLES.flatMap((p) => p.rounds.flatMap((r) => [...r.truths.map((t) => t.id), r.fib.id]))
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('getPuzzle', () => {
  it('returns the day for a number', () => {
    expect(getPuzzle(3).rounds[0].theme).toBe(PUZZLES[2].rounds[0].theme)
  })

  it('cycles the set past its end, keeping the real number', () => {
    const p = getPuzzle(PUZZLES.length + 2)
    expect(p.rounds[2].theme).toBe(PUZZLES[1].rounds[2].theme)
    expect(p.number).toBe(PUZZLES.length + 2)
  })
})
