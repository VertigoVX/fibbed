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
          <div className="ticks" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className="tick" data-on={i < cleared || undefined} />
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
