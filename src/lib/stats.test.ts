import { loadStats, recordResult, loadProgress, saveProgress } from './stats'

describe('stats', () => {
  it('starts empty', () => {
    expect(loadStats()).toEqual({ played: 0, caught: 0, streak: 0, best: 0, last: null, results: {} })
  })

  it('records a caught game and starts a streak', () => {
    const s = recordResult(1, { cleared: 4, caught: true })
    expect(s).toMatchObject({ played: 1, caught: 1, streak: 1, best: 1, last: 1 })
    expect(loadStats()).toEqual(s)
  })

  it('extends the streak on consecutive puzzles', () => {
    recordResult(1, { cleared: 4, caught: true })
    recordResult(2, { cleared: 4, caught: true })
    expect(recordResult(3, { cleared: 4, caught: true })).toMatchObject({ streak: 3, best: 3 })
  })

  it('resets the streak when fooled but keeps the best', () => {
    recordResult(1, { cleared: 4, caught: true })
    recordResult(2, { cleared: 4, caught: true })
    expect(recordResult(3, { cleared: 1, caught: false })).toMatchObject({ streak: 0, best: 2, played: 3, caught: 2 })
  })

  it('resets the streak after a missed day', () => {
    recordResult(1, { cleared: 4, caught: true })
    expect(recordResult(3, { cleared: 4, caught: true })).toMatchObject({ streak: 1 })
  })

  it('does not count the same puzzle twice', () => {
    recordResult(1, { cleared: 4, caught: true })
    expect(recordResult(1, { cleared: 0, caught: false })).toMatchObject({ played: 1, caught: 1, streak: 1 })
  })

  it('survives corrupted storage', () => {
    localStorage.setItem('fibbed:stats', '{not json')
    expect(loadStats().played).toBe(0)
  })
})

describe('progress', () => {
  it('saves and restores picks for a puzzle', () => {
    saveProgress(5, ['a', 'b'])
    expect(loadProgress(5)).toEqual(['a', 'b'])
  })

  it('forgets progress from another puzzle', () => {
    saveProgress(5, ['a'])
    expect(loadProgress(6)).toEqual([])
  })
})
