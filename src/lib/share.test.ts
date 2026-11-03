import { shareText } from './share'
import type { DayOutcome, Round } from './types'

const day = (rounds: [number, boolean][]): DayOutcome => {
  const fibsCaught = rounds.filter(([, c]) => c).length
  return {
    rounds: rounds.map(([cleared, caught]) => ({ cleared, caught })),
    fibsCaught,
    cleared: rounds.reduce((s, [c]) => s + c, 0),
    perfect: fibsCaught === 3,
    done: true,
  }
}

const mockRounds = (themes: string[]): Round[] =>
  themes.map((theme) => ({
    theme,
    level: 'easy' as const,
    truths: [],
    fib: { id: 'fib', text: 'fib', explanation: 'exp' },
  }))

const URL = 'https://x.test/fibbed/'

describe('shareText', () => {
  it('shows header, round icons with themes, and url', () => {
    const result = shareText(12, day([[3, true], [1, false], [3, true]]), URL, mockRounds(['Dogs', 'Egypt', 'Space']))
    expect(result).toBe('Fibbed No. 12 — 2/3\n✅ Dogs  ❌ Egypt  ✅ Space\n' + URL)
  })

  it('marks a perfect paper with ✦', () => {
    const result = shareText(4, day([[3, true], [3, true], [3, true]]), URL, mockRounds(['A', 'B', 'C']))
    expect(result).toContain('3/3 ✦')
  })

  it('works without round themes passed', () => {
    const result = shareText(4, day([[3, true], [0, false], [3, true]]), URL)
    expect(result).toContain('✅ Round 1')
    expect(result).toContain('❌ Round 2')
  })

  it('handles a day with no fibs caught', () => {
    const result = shareText(4, day([[0, false], [1, false], [2, false]]), URL, mockRounds(['A', 'B', 'C']))
    expect(result).toContain('0/3')
    expect(result).not.toContain('✦')
  })
})
