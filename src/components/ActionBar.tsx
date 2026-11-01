type Props = { cleared: number; canMark: boolean; onMark: () => void }

export function ActionBar({ cleared, canMark, onMark }: Props) {
  return (
    <div className="actionbar">
      <div className="actionbar__inner">
        <div className="progress">
          <p role="status">{cleared} of 4 truths cleared</p>
          <div className="ticks" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="tick" data-on={i < cleared || undefined} />
            ))}
          </div>
        </div>
        <button type="button" className="btn btn--primary" disabled={!canMark} onClick={onMark}>
          Mark as true
        </button>
      </div>
    </div>
  )
}
