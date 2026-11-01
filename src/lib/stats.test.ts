import { loadStats, recordResult, loadProgress, saveProgress } from './stats'

const result = (fibsCaught: number) => ({ fibsCaught, cleared: fibsCaught * 3 })

describe('stats', () => {
  it('starts empty', () => {
    expect(loadStats()).toEqual({ played: 0, perfect: 0, streak: 0, best: 0, last: null, results: {} })
  })

  it('records a day and starts a streak when at least one fib was caught', () => {
    const s = recordResult(1, result(1))
    expect(s).toMatchObject({ played: 1, perfect: 0, streak: 1, best: 1, last: 1 })
    expect(loadStats()).toEqual(s)
  })

  it('counts perfect days', () => {
    expect(recordResult(1, result(3))).toMatchObject({ perfect: 1 })
  })

  it('extends the streak on consecutive days', () => {
    recordResult(1, result(1))
    recordResult(2, result(3))
    expect(recordResult(3, result(2))).toMatchObject({ streak: 3, best: 3 })
  })

  it('resets the streak on a day with no fibs caught, keeping the best', () => {
    recordResult(1, result(2))
    recordResult(2, result(1))
    expect(recordResult(3, result(0))).toMatchObject({ streak: 0, best: 2, played: 3 })
  })

  it('resets the streak after a missed day', () => {
    recordResult(1, result(2))
    expect(recordResult(3, result(2))).toMatchObject({ streak: 1 })
  })

  it('does not count the same day twice', () => {
    recordResult(1, result(3))
    expect(recordResult(1, result(0))).toMatchObject({ played: 1, perfect: 1, streak: 1 })
  })

  it('ignores stats saved by the old one-round game', () => {
    localStorage.setItem('fibbed:stats', JSON.stringify({ played: 4, caught: 2, streak: 1, best: 2, last: 1, results: {} }))
    expect(loadStats().played).toBe(0)
  })

  it('survives corrupted storage', () => {
    localStorage.setItem('fibbed:stats:v2', '{not json')
    expect(loadStats().played).toBe(0)
  })
})

describe('progress', () => {
  it('saves and restores each round’s picks for a day', () => {
    saveProgress(5, [['a', 'b'], ['c'], []])
    expect(loadProgress(5)).toEqual([['a', 'b'], ['c'], []])
  })

  it('forgets progress from another day', () => {
    saveProgress(5, [['a'], [], []])
    expect(loadProgress(6)).toEqual([[], [], []])
  })

  it('ignores progress saved by the old one-round game', () => {
    localStorage.setItem('fibbed:progress', JSON.stringify({ number: 5, picks: ['a'] }))
    expect(loadProgress(5)).toEqual([[], [], []])
  })
})
