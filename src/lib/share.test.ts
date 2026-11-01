import { shareText } from './share'
import type { DayOutcome } from './types'

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

describe('shareText', () => {
  it('shows one line per round and the total', () => {
    expect(shareText(12, day([[3, true], [1, false], [3, true]]), 'https://x.test/fibbed/')).toBe(
      'Fibbed #12\n🟩🟩🟩🕵️\n🟩🟥\n🟩🟩🟩🕵️\n2 of 3 fibs caught\nhttps://x.test/fibbed/',
    )
  })

  it('calls out a perfect paper', () => {
    expect(shareText(4, day([[3, true], [3, true], [3, true]]), 'u')).toContain('Perfect paper: 3 of 3 fibs caught')
  })

  it('shows a fib caught on the first pick of a round as a single red square', () => {
    expect(shareText(4, day([[0, false], [3, true], [2, false]]), 'u').split('\n').slice(1, 4)).toEqual(['🟥', '🟩🟩🟩🕵️', '🟩🟩🟥'])
  })

  it('handles a day with no fibs caught', () => {
    expect(shareText(4, day([[0, false], [1, false], [2, false]]), 'u')).toContain('0 of 3 fibs caught')
  })
})
