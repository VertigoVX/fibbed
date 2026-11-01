export const LAUNCH_DATE = '2026-11-02'

const pad = (n: number) => String(n).padStart(2, '0')

/** The player's local calendar date as YYYY-MM-DD. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Days since the epoch for a local calendar date, immune to DST shifts. */
function dayIndex(year: number, monthIndex: number, day: number): number {
  return Math.round(Date.UTC(year, monthIndex, day) / 86_400_000)
}

/** Puzzle number for the player's local day; launch day is #1. */
export function puzzleNumberFor(d: Date): number {
  const [y, m, day] = LAUNCH_DATE.split('-').map(Number)
  const n = dayIndex(d.getFullYear(), d.getMonth(), d.getDate()) - dayIndex(y, m - 1, day) + 1
  return Math.max(1, n)
}

/** Local date for a puzzle number (inverse of puzzleNumberFor). */
export function dateForPuzzle(n: number): Date {
  const [y, m, day] = LAUNCH_DATE.split('-').map(Number)
  return new Date(y, m - 1, day + n - 1)
}
