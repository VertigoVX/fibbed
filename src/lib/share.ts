import type { Outcome } from './types'

export function shareText(number: number, outcome: Outcome, url: string): string {
  const grid = '🟩'.repeat(outcome.cleared) + (outcome.caught ? '🕵️' : '🟥')
  const line = outcome.caught
    ? 'Caught the fib'
    : outcome.cleared === 0
      ? 'Fibbed on the first pick'
      : `Fibbed after ${outcome.cleared} of 4`
  return `Fibbed #${number}\n${grid} ${line}\n${url}`
}
