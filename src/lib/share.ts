import type { DayOutcome } from './types'

export function shareText(number: number, outcome: DayOutcome, url: string): string {
  const lines = outcome.rounds.map((r) => '🟩'.repeat(r.cleared) + (r.caught ? '🕵️' : '🟥'))
  const total = `${outcome.fibsCaught} of ${outcome.rounds.length} fibs caught`
  return [`Fibbed #${number}`, ...lines, outcome.perfect ? `Perfect paper: ${total}` : total, url].join('\n')
}
