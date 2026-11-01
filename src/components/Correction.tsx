import type { Round } from '../lib/types'

/** The fib, struck from the record and set right. */
export function Correction({ round, label = 'Correction' }: { round: Round; label?: string }) {
  return (
    <section className="correction" aria-label={label}>
      <h3>Correction</h3>
      <p>
        We printed “{round.fib.text}” This was false. {round.fib.explanation}
      </p>
      {round.fib.source && (
        <a href={round.fib.source.url} target="_blank" rel="noreferrer">
          {round.fib.source.label}
        </a>
      )}
    </section>
  )
}
