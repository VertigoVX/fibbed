import type { GameState, Puzzle, Statement } from '../lib/types'

type Props = {
  puzzle: Puzzle
  statements: Statement[]
  game: GameState
  selected: string | null
  onSelect: (id: string) => void
}

export function StatementList({ puzzle, statements, game, selected, onSelect }: Props) {
  const ended = game.status !== 'playing'
  return (
    <ol className="statements" aria-label="Statements">
      {statements.map((s, i) => {
        const cleared = game.picks.includes(s.id) && s.id !== puzzle.fib.id
        const isFib = s.id === puzzle.fib.id
        const picked = selected === s.id
        const truth = puzzle.truths.find((t) => t.id === s.id)
        const verdict = ended ? (isFib ? 'fib' : 'true') : cleared ? 'true' : null
        const state = ended ? (isFib ? 'The fib' : 'True') : cleared ? 'Cleared, true' : picked ? 'Selected' : ''
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
              {state && <span className="statement__state">{state}</span>}
            </button>
            {ended && truth?.source && (
              <a
                className="statement__source"
                href={truth.source.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Source: ${truth.source.label}, for “${truth.text}”`}
              >
                {truth.source.label}
              </a>
            )}
          </li>
        )
      })}
    </ol>
  )
}
