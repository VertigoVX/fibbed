const TOTAL_ROUNDS = 3

type Props = {
  round: number
  cleared: number
  total: number
  reviewing: boolean
  canMark: boolean
  onMark: () => void
  onNext: () => void
}

export function ActionBar({ round, cleared, total, reviewing, canMark, onMark, onNext }: Props) {
  return (
    <div className="actionbar">
      <div className="actionbar__inner">
        <div className="progress">
          <p role="status">{reviewing ? `Round ${round} done` : `${cleared} of ${total} truths cleared`}</p>
          <div className="progress__dots" aria-hidden="true">
            {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
              <span
                key={i}
                className="round-dot"
                data-done={i < round - 1 || undefined}
                data-current={i === round - 1 || undefined}
              />
            ))}
          </div>
        </div>
        {reviewing ? (
          <button type="button" className="btn btn--primary" onClick={onNext}>
            Next round
          </button>
        ) : (
          <button type="button" className="btn btn--primary" disabled={!canMark} onClick={onMark}>
            Mark as true
          </button>
        )}
      </div>
    </div>
  )
}
