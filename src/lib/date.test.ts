import { dateKey, puzzleNumberFor, LAUNCH_DATE } from './date'

describe('dateKey', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('puzzleNumberFor', () => {
  it('is 1 on launch day', () => {
    expect(LAUNCH_DATE).toBe('2026-11-02')
    expect(puzzleNumberFor(new Date(2026, 10, 2, 0, 1))).toBe(1)
    expect(puzzleNumberFor(new Date(2026, 10, 2, 23, 59))).toBe(1)
  })

  it('counts calendar days in the player\'s local time', () => {
    expect(puzzleNumberFor(new Date(2026, 10, 3, 0, 0))).toBe(2)
    expect(puzzleNumberFor(new Date(2026, 11, 2, 12))).toBe(31)
  })

  it('is not thrown off by daylight-saving changes', () => {
    // 2027-03-14 is a DST change in many zones; whole days must still count as one each
    expect(puzzleNumberFor(new Date(2027, 2, 15, 1))).toBe(puzzleNumberFor(new Date(2027, 2, 14, 1)) + 1)
  })

  it('clamps dates before launch to puzzle 1', () => {
    expect(puzzleNumberFor(new Date(2026, 9, 1))).toBe(1)
  })
})
