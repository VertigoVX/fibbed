import { useEffect, useState, type RefObject } from 'react'
import type { Backend, PuzzleStats, ScoreCounts } from '../lib/backend'
import { dayOutcome } from '../lib/game'
import { shareText } from '../lib/share'
import type { Stats } from '../lib/stats'
import type { DayState, Puzzle } from '../lib/types'
import { BoxScore } from './BoxScore'
import { Correction } from './Correction'
import { percentileBelow, ScoreChart } from './ScoreChart'
import { ShareRow } from './ShareRow'

type Props = {
  puzzle: Puzzle
  day: DayState
  stats: Stats
  backend: Backend
  headingRef: RefObject<HTMLHeadingElement | null>
  /** Resolves once today's result has been sent, so the spread includes you. */
  saved: Promise<unknown>
  signedIn: boolean
  onSignIn: () => void
}

export const SHARE_URL =
  typeof location !== 'undefined' ? new URL(import.meta.env.BASE_URL, location.origin).href : 'https://fibbed.game'

export function Summary({ puzzle, day, stats, backend, headingRef, saved, signedIn, onSignIn }: Props) {
  const outcome = dayOutcome(day, puzzle)
  const totalTruths = puzzle.rounds.reduce((n, r) => n + r.truths.length, 0)
  const maxScore = totalTruths + puzzle.rounds.length
  const score = outcome.cleared + outcome.fibsCaught
  const [crowd, setCrowd] = useState<PuzzleStats | null>(null)
  const [counts, setCounts] = useState<ScoreCounts | null>(null)

  useEffect(() => {
    let live = true
    saved
      .catch(() => {})
      .then(() => Promise.all([backend.getStats(puzzle.number), backend.getScoreCounts(puzzle.number)]))
      .then(([s, c]) => {
        if (!live) return
        setCrowd(s)
        setCounts(c)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [backend, puzzle.number, saved])

  const spread = counts ? percentileBelow(counts, score) : null

  return (
    <>
      <header className="lede summary">
        <h1 ref={headingRef} tabIndex={-1}>
          {outcome.perfect ? 'A perfect paper.' : `You caught ${outcome.fibsCaught} of ${puzzle.rounds.length} fibs.`}
        </h1>
        <p className="deck">
          {outcome.perfect
            ? `All ${totalTruths} truths cleared and every fib left standing.`
            : `${outcome.cleared} of ${totalTruths} truths cleared.`}
        </p>
      </header>

      <section className="compare" aria-label="How you compare">
        <hr className="rule--double" />
        <h2 className="compare__score">
          You scored {score} of {maxScore}.
        </h2>
        <p className="compare__how">A point for every truth cleared and every fib caught.</p>
        {spread && spread.total > 0 && (
          <>
            <p className="compare__rank">
              {spread.total === 1
                ? 'You’re the first to finish today’s paper.'
                : `Better than ${spread.percent}% of today’s ${spread.total} players.`}
            </p>
            <ScoreChart counts={counts!} score={score} />
          </>
        )}
        {crowd && crowd.players > 1 && (
          <p className="crowd">
            {crowd.perfect} with a perfect paper. Round 3 fooled {crowd.readerFooled} of {crowd.players}.
          </p>
        )}
      </section>

      <BoxScore stats={stats} />
      <ShareRow resultText={shareText(puzzle.number, outcome, SHARE_URL)} url={SHARE_URL} />
      {backend.account.available && !signedIn && (
        <p className="nudge">
          <button type="button" className="btn btn--quiet" onClick={onSignIn}>
            Sign in to keep your streak
          </button>
          <span>on every device, with your past papers.</span>
        </p>
      )}

      <div className="rounds">
        {puzzle.rounds.map((round, i) => {
          const r = outcome.rounds[i]
          return (
            <article key={round.fib.id} className="round-recap">
              <hr className="rule--double" />
              <h2>
                <span className="round-recap__meta">
                  Round {i + 1}, {r.caught ? 'caught' : 'fibbed'}
                </span>{' '}
                {round.theme}
              </h2>
              <Correction round={round} label={`Correction: ${round.theme}`} />
              <ul className="truths" aria-label={`The truths: ${round.theme}`}>
                {round.truths.map((t) => (
                  <li key={t.id}>
                    <p>{t.text}</p>
                    {t.source && (
                      <a href={t.source.url} target="_blank" rel="noreferrer" aria-label={`Source: ${t.source.label}, for “${t.text}”`}>
                        {t.source.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          )
        })}
      </div>
    </>
  )
}
