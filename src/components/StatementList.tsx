import type { Round, RoundState, Statement } from '../lib/types'

type Props = {
  round: Round
  statements: Statement[]
  state: RoundState
  selected: string | null
  onSelect: (id: string) => void
}

export function StatementList({ round, statements, state, selected, onSelect }: Props) {
  const ended = state.status !== 'playing'
  return (
    <ol className="statements" aria-label="Statements">
      {statements.map((s, i) => {
        const isFib = s.id === round.fib.id
        const cleared = state.picks.includes(s.id) && !isFib
        const picked = selected === s.id
        const verdict = ended ? (isFib ? 'fib' : 'true') : cleared ? 'true' : null
        const label = ended ? (isFib ? 'The fib' : 'True') : cleared ? 'Cleared, true' : picked ? 'Selected' : ''
        return (
          <li key={s.id} className="statement" data-verdict={verdict ?? undefined} data-selected={picked || undefined}>
            <button
              type="button"
              className="statement__button"
              aria-pressed={picked}
              disabled={cleared || ended}
              onClick={() => onSelect(s.id)}
            >
              <span className="statement__num" aria-hidden="true">
                {i + 1}
              </span>
              <span className="statement__text">{s.text}</span>
              {label && <span className="statement__state">{label}</span>}
            </button>
          </li>
        )
      })}
    </ol>
  )
}
