import { loadStats, recordResult, loadProgress, saveProgress, statsFromResults, mergeResults } from './stats'

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

describe('statsFromResults (history from an account, merged with this device)', () => {
  const r = (fibsCaught: number) => ({ fibsCaught, cleared: fibsCaught * 3 })

  it('counts played and perfect days', () => {
    expect(statsFromResults({ 1: r(3), 2: r(1), 4: r(3) }, 4)).toMatchObject({ played: 3, perfect: 2 })
  })

  it('finds the current streak ending on the latest day', () => {
    expect(statsFromResults({ 1: r(1), 2: r(0), 3: r(2), 4: r(1) }, 4)).toMatchObject({ streak: 2, best: 2 })
  })

  it('keeps the streak alive until today’s paper is missed', () => {
    expect(statsFromResults({ 2: r(1), 3: r(1) }, 4).streak).toBe(2)
    expect(statsFromResults({ 2: r(1), 3: r(1) }, 5).streak).toBe(0)
  })

  it('remembers the best run', () => {
    expect(statsFromResults({ 1: r(1), 2: r(1), 3: r(1), 5: r(1) }, 5)).toMatchObject({ streak: 1, best: 3 })
  })

  it('is empty with no results', () => {
    expect(statsFromResults({}, 3)).toEqual({ played: 0, perfect: 0, streak: 0, best: 0, last: null, results: {} })
  })
})

describe('mergeResults', () => {
  it('takes the union, preferring the account’s result for a day', () => {
    expect(mergeResults({ 1: { fibsCaught: 1, cleared: 4 }, 2: { fibsCaught: 0, cleared: 0 } }, [
      { puzzleNumber: 2, fibsCaught: 3, cleared: 9 },
      { puzzleNumber: 3, fibsCaught: 1, cleared: 5 },
    ])).toEqual({
      1: { fibsCaught: 1, cleared: 4 },
      2: { fibsCaught: 3, cleared: 9 },
      3: { fibsCaught: 1, cleared: 5 },
    })
  })
})
