import { useEffect, useRef, useState } from 'react'
import type { Backend, PuzzleStats } from '../lib/backend'
import { outcomeOf } from '../lib/game'
import { shareText } from '../lib/share'
import type { Stats } from '../lib/stats'
import type { GameState, Puzzle } from '../lib/types'

type Props = { puzzle: Puzzle; game: GameState; stats: Stats; backend: Backend }

const SHARE_URL = typeof location !== 'undefined' ? location.origin : 'https://fibbed.game'

export function Result({ puzzle, game, stats, backend }: Props) {
  const outcome = outcomeOf(game, puzzle)
  const heading = useRef<HTMLHeadingElement>(null)
  const [crowd, setCrowd] = useState<PuzzleStats | null>(null)
  const [shared, setShared] = useState<string | null>(null)

  useEffect(() => {
    heading.current?.focus()
  }, [])

  useEffect(() => {
    let live = true
    backend
      .getStats(puzzle.number)
      .then((s) => live && setCrowd(s))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [backend, puzzle.number])

  async function share() {
    const text = shareText(puzzle.number, outcome, SHARE_URL)
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ text })
        setShared('Shared.')
        return
      }
      await navigator.clipboard.writeText(text)
      setShared('Copied. Paste it anywhere.')
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setShared('Could not copy. Long-press to select the result instead.')
    }
  }

  return (
    <section className="result" aria-labelledby="result-head">
      <hr className="rule--double" />
      <h2 id="result-head" ref={heading} tabIndex={-1}>
        {outcome.caught ? 'You caught the fib.' : 'You were fibbed.'}
      </h2>
      <p className="lead">
        {outcome.caught
          ? 'Four truths cleared, and the fib left standing on its own.'
          : outcome.cleared === 0
            ? 'It got you on the very first pick.'
            : `You cleared ${outcome.cleared} of 4 truths before it got you.`}
      </p>
      {crowd && crowd.players > 0 && (
        <p className="crowd">
          {crowd.caught} of {crowd.players} players caught it.
        </p>
      )}

      <section className="correction" aria-labelledby="correction-head">
        <h3 id="correction-head">Correction</h3>
        <p>
          We printed “{puzzle.fib.text}” This was false. {puzzle.fib.explanation}
        </p>
        {puzzle.fib.source && (
          <a href={puzzle.fib.source.url} target="_blank" rel="noreferrer">
            {puzzle.fib.source.label}
          </a>
        )}
      </section>

      <section className="boxscore" aria-label="Your record">
        <div>
          <p className="boxscore__fig">{stats.played}</p>
          <p>Played</p>
        </div>
        <div>
          <p className="boxscore__fig">{stats.caught}</p>
          <p>Caught</p>
        </div>
        <div>
          <p className="boxscore__fig">{stats.streak}</p>
          <p>Streak</p>
        </div>
        <div>
          <p className="boxscore__fig">{stats.best}</p>
          <p>Best</p>
        </div>
      </section>

      <div className="share">
        <button type="button" className="btn btn--primary" onClick={share}>
          Share result
        </button>
        <p className="share__status" role="status">
          {shared}
        </p>
      </div>
    </section>
  )
}
