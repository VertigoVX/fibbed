import { shareText } from './share'

describe('shareText', () => {
  it('shows a caught game as four cleared truths and a caught fib', () => {
    expect(shareText(12, { cleared: 4, caught: true }, 'https://fibbed.game')).toBe(
      'Fibbed #12\n🟩🟩🟩🟩🕵️ Caught the fib\nhttps://fibbed.game',
    )
  })

  it('shows where a fooled game went wrong', () => {
    expect(shareText(3, { cleared: 1, caught: false }, 'https://fibbed.game')).toBe(
      'Fibbed #3\n🟩🟥 Fibbed after 1 of 4\nhttps://fibbed.game',
    )
  })

  it('handles being fooled on the first pick', () => {
    expect(shareText(3, { cleared: 0, caught: false }, 'x')).toBe('Fibbed #3\n🟥 Fibbed on the first pick\nx')
  })

  it('never contains the statements themselves', () => {
    expect(shareText(1, { cleared: 2, caught: false }, 'x')).not.toMatch(/truth|fib:/i)
  })
})
