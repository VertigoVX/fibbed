import { useEffect, useState, type RefObject } from 'react'
import type { Backend, PuzzleStats } from '../lib/backend'
import { dayOutcome } from '../lib/game'
import { shareText } from '../lib/share'
import type { Stats } from '../lib/stats'
import type { DayState, Puzzle } from '../lib/types'
import { Correction } from './Correction'

type Props = {
  puzzle: Puzzle
  day: DayState
  stats: Stats
  backend: Backend
  headingRef: RefObject<HTMLHeadingElement | null>
}

const SHARE_URL =
  typeof location !== 'undefined' ? new URL(import.meta.env.BASE_URL, location.origin).href : 'https://fibbed.game'

export function Summary({ puzzle, day, stats, backend, headingRef }: Props) {
  const outcome = dayOutcome(day, puzzle)
  const totalTruths = puzzle.rounds.reduce((n, r) => n + r.truths.length, 0)
  const [crowd, setCrowd] = useState<PuzzleStats | null>(null)
  const [shared, setShared] = useState<string | null>(null)

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
        {crowd && crowd.players > 0 && (
          <p className="crowd">
            {crowd.players} {crowd.players === 1 ? 'player' : 'players'} today, {crowd.perfect} with a perfect paper. Round 3 fooled{' '}
            {crowd.readerFooled} of them.
          </p>
        )}
      </header>

      <section className="boxscore" aria-label="Your record">
        <div>
          <p className="boxscore__fig">{stats.played}</p>
          <p>Played</p>
        </div>
        <div>
          <p className="boxscore__fig">{stats.perfect}</p>
          <p>Perfect</p>
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
