import type { DayOutcome, Round } from './types'

export function shareText(number: number, outcome: DayOutcome, url: string, rounds?: Round[]): string {
  const caught = outcome.fibsCaught
  const total = outcome.rounds.length
  const header = `Fibbed No. ${number} — ${caught}/${total}${outcome.perfect ? ' ✦' : ''}`
  const roundLines = outcome.rounds.map((r, i) => {
    const icon = r.caught ? '✅' : '❌'
    const theme = rounds?.[i]?.theme ?? `Round ${i + 1}`
    return `${icon} ${theme}`
  })
  return [header, roundLines.join('  '), url].join('\n')
}
