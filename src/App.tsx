import { useEffect, useMemo, useState } from 'react'
import { getPuzzle } from './data/puzzles'
import { withFeaturedFib, type Backend } from './lib/backend'
import { dateForPuzzle, puzzleNumberFor } from './lib/date'
import { arrange, outcomeOf, pick, replay } from './lib/game'
import { loadProgress, loadStats, recordResult, saveProgress, type Stats } from './lib/stats'
import type { GameState, Puzzle } from './lib/types'
import { Masthead } from './components/Masthead'
import { StatementList } from './components/StatementList'
import { ActionBar } from './components/ActionBar'
import { Result } from './components/Result'
import { FibForm } from './components/FibForm'

type Props = { backend: Backend; now?: Date; clientId?: string }

const FEATURED_TIMEOUT_MS = 1500

/** Waits briefly for a community fib; the house fib runs if the server is slow. */
function useTodaysPuzzle(number: number, backend: Backend): Puzzle | null {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  useEffect(() => {
    let live = true
    const base = getPuzzle(number)
    const timeout = new Promise<null>((r) => setTimeout(() => r(null), FEATURED_TIMEOUT_MS))
    Promise.race([backend.getFeaturedFib(number).catch(() => null), timeout]).then((featured) => {
      if (live) setPuzzle(withFeaturedFib(base, featured))
    })
    return () => {
      live = false
    }
  }, [number, backend])
  return puzzle
}

export default function App({ backend, now = new Date(), clientId = 'anonymous' }: Props) {
  const number = useMemo(() => puzzleNumberFor(now), [now])
  const theme = getPuzzle(number).theme
  const puzzle = useTodaysPuzzle(number, backend)
  const [game, setGame] = useState<GameState | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>(loadStats)

  useEffect(() => {
    if (puzzle) setGame(replay(puzzle, loadProgress(number)))
  }, [puzzle, number])

  const statements = useMemo(() => (puzzle ? arrange(puzzle) : []), [puzzle])
  const ended = game !== null && game.status !== 'playing'

  function markTrue() {
    if (!puzzle || !game || !selected) return
    const next = pick(game, puzzle, selected)
    setSelected(null)
    setGame(next)
    saveProgress(number, next.picks)
    if (next.status !== 'playing') {
      const isNew = !loadStats().results[number]
      const outcome = outcomeOf(next, puzzle)
      setStats(recordResult(number, outcome))
      if (isNew) void backend.recordResult({ puzzleNumber: number, clientId, picks: next.picks, caught: outcome.caught })
    }
  }

  // Desktop: 1 to 5 picks a statement, Enter marks it as true.
  useEffect(() => {
    if (!puzzle || !game || ended) return
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= statements.length) {
        const s = statements[n - 1]
        if (!game!.picks.includes(s.id)) setSelected(s.id)
        return
      }
      const onStatement = target === document.body || target.classList.contains('statement__button')
      if (e.key === 'Enter' && selected && onStatement) {
        e.preventDefault()
        markTrue()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="page" data-playing={(puzzle && game && !ended) || undefined}>
      <Masthead number={number} date={dateForPuzzle(number)} />
      <main id="main" className="paper">
        <header className="lede">
          <h1>{theme}</h1>
          <p className="deck">Four of these are true and one is a fib. Mark the true ones and leave the fib standing.</p>
        </header>

        {puzzle && game ? (
          <StatementList
            puzzle={puzzle}
            statements={statements}
            game={game}
            selected={selected}
            onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
          />
        ) : (
          <p className="loading" role="status">
            Setting today’s type…
          </p>
        )}

        {puzzle && game && ended && (
          <>
            <Result puzzle={puzzle} game={game} stats={stats} backend={backend} />
            <FibForm number={number + 1} backend={backend} clientId={clientId} />
          </>
        )}
      </main>
      {puzzle && game && !ended && (
        <ActionBar cleared={outcomeOf(game, puzzle).cleared} canMark={selected !== null} onMark={markTrue} />
      )}
      <Colophon />
    </div>
  )
}

function Colophon() {
  return (
    <footer className="colophon">
      <p>A new paper every midnight, your time. Facts are checked against the linked sources; tell us if one is wrong.</p>
    </footer>
  )
}
