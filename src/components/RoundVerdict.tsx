import type { Round, RoundState } from '../lib/types'
import { Correction } from './Correction'

export function RoundVerdict({ round, state }: { round: Round; state: RoundState }) {
  const caught = state.status === 'caught'
  return (
    <section className="verdict" aria-labelledby="verdict-head">
      <h2 id="verdict-head">{caught ? 'Caught it.' : 'Fibbed.'}</h2>
      <p className="lead">
        {caught ? 'All three truths cleared, and the fib left standing on its own.' : 'That one was the fib.'}
      </p>
      <Correction round={round} />
    </section>
  )
}
