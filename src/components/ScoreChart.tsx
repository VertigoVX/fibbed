import type { ScoreCounts } from '../lib/backend'

const MAX_SCORE = 12
const W = 340
const H = 150
const PAD_X = 6
const PAD_TOP = 22
const PAD_BOTTOM = 22
const SLOT = (W - PAD_X * 2) / (MAX_SCORE + 1)
const BAR = Math.min(20, SLOT - 2)
const R = 4

/** A column with a 4px rounded data end and a square foot on the baseline. */
function column(x: number, y: number, w: number, h: number) {
  if (h <= 0) return ''
  const r = Math.min(R, h, w / 2)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

/** Your own result is always in the spread, even if the server has not caught up yet. */
export function withYou(counts: ScoreCounts, score: number): ScoreCounts {
  return (counts[score] ?? 0) > 0 ? counts : { ...counts, [score]: 1 }
}

export function percentileBelow(raw: ScoreCounts, score: number) {
  const counts = withYou(raw, score)
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const below = Object.entries(counts).reduce((a, [s, n]) => (Number(s) < score ? a + n : a), 0)
  return { total, percent: total ? Math.round((below / total) * 100) : 0 }
}

/** Today's spread of scores, with your column marked. */
export function ScoreChart({ counts: raw, score }: { counts: ScoreCounts; score: number }) {
  const counts = withYou(raw, score)
  const scores = Array.from({ length: MAX_SCORE + 1 }, (_, s) => s)
  const max = Math.max(1, ...scores.map((s) => counts[s] ?? 0))
  const plotH = H - PAD_TOP - PAD_BOTTOM
  const baseline = PAD_TOP + plotH

  return (
    <figure className="chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Column chart of the scores of today’s players, from 0 to ${MAX_SCORE}. Your score, ${score}, is marked.`}
      >
        <line className="chart__axis" x1={PAD_X} x2={W - PAD_X} y1={baseline + 0.5} y2={baseline + 0.5} />
        {scores.map((s) => {
          const n = counts[s] ?? 0
          const h = (n / max) * plotH
          const x = PAD_X + s * SLOT + (SLOT - BAR) / 2
          const you = s === score
          return (
            <g key={s} className={you ? 'chart__col chart__col--you' : 'chart__col'}>
              <title>{`Score ${s}: ${n} ${n === 1 ? 'player' : 'players'}${you ? ', including you' : ''}`}</title>
              <rect className="chart__hit" x={PAD_X + s * SLOT} y={PAD_TOP - 18} width={SLOT} height={plotH + 18} />
              <path d={column(x, baseline - h, BAR, h)} />
              {you && (
                <text className="chart__you" x={x + BAR / 2} y={baseline - h - 6} textAnchor="middle">
                  You
                </text>
              )}
              {s % 3 === 0 && (
                <text className="chart__tick" x={x + BAR / 2} y={H - 6} textAnchor="middle">
                  {s}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <table className="visually-hidden" aria-label="Players by score">
        <thead>
          <tr>
            <th scope="col">Score</th>
            <th scope="col">Players</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s) => (
            <tr key={s}>
              <td>
                {s}
                {s === score ? ' (you)' : ''}
              </td>
              <td>{counts[s] ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
