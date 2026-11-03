import { useEffect, useMemo, useRef, useState } from 'react'
import { getPuzzle } from './data/puzzles'
import { withFeaturedFib, type Backend, type Player } from './lib/backend'
import { dateForPuzzle, puzzleNumberFor } from './lib/date'
import { arrange, currentRound, dayOutcome, pickInDay, replayDay, ROUNDS } from './lib/game'
import { loadProgress, loadStats, mergeResults, recordResult, saveProgress, statsFromResults, type HistoryEntry, type Stats } from './lib/stats'
import type { DayState, Puzzle } from './lib/types'
import { Masthead } from './components/Masthead'
import { StatementList } from './components/StatementList'
import { ActionBar } from './components/ActionBar'
import { RoundVerdict } from './components/RoundVerdict'
import { Summary } from './components/Summary'
import { AccountPage } from './components/AccountPage'
import { SHARE_URL } from './components/Summary'

type Props = { backend: Backend; now?: Date; clientId?: string }

const FEATURED_TIMEOUT_MS = 1500
const history_ = typeof window !== 'undefined' ? window.history : (undefined as unknown as History)
const LEVEL_NAME = { easy: 'easy', medium: 'medium', hard: 'hard' } as const

/** Waits briefly for a reader fib; the house fib runs if the server is slow. */
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
  const today = useMemo(() => puzzleNumberFor(now), [now])
  const [number, setNumber] = useState(today)
  const puzzle = useTodaysPuzzle(number, backend)
  const [day, setDay] = useState<DayState | null>(null)
  /** The round on screen. It stays on a finished round until the player moves on. */
  const [view, setView] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [localStats, setLocalStats] = useState<Stats>(loadStats)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [player, setPlayer] = useState<Player | null>(null)
  const [page, setPage] = useState<'game' | 'account'>(() =>
    typeof location !== 'undefined' && location.hash === '#papers' ? 'account' : 'game',
  )
  const [fibRan, setFibRan] = useState<string | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const moved = useRef(false)
  const saved = useRef<Promise<unknown>>(Promise.resolve())
  const account = backend.account

  const stats = useMemo(
    () => statsFromResults(mergeResults(localStats.results, history), today),
    [localStats, history, today],
  )

  // Accounts: follow sign-in, bring this device's results into the account, then load its history.
  useEffect(() => {
    if (!account.available) return
    let live = true
    const onPlayer = async (p: Player | null) => {
      if (!live) return
      setPlayer(p)
      if (!p) return setHistory([])
      await account.claimDevice(clientId).catch(() => {})
      const h = await account.history().catch(() => [])
      if (live) setHistory(h)
    }
    account.current().then(onPlayer).catch(() => {})
    const stop = account.onChange((p) => void onPlayer(p))
    return () => {
      live = false
      stop()
    }
  }, [account, clientId])

  // Check if yesterday's submitted fib was selected as today's featured fib.
  useEffect(() => {
    if (number <= 1) return
    let live = true
    Promise.all([backend.getSubmittedFib(number - 1), backend.getFeaturedFib(number)])
      .then(([submitted, featured]) => {
        if (live && submitted && featured && submitted.trim() === featured.text.trim()) setFibRan(submitted)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [backend, number])

  function openPage(next: 'game' | 'account') {
    setPage(next)
    try {
      history_.replaceState(null, '', next === 'account' ? '#papers' : location.pathname + location.search)
    } catch {
      /* not in a browser */
    }
  }

  useEffect(() => {
    if (!puzzle) return
    const restored = replayDay(puzzle, loadProgress(number))
    setDay(restored)
    setView(currentRound(restored))
  }, [puzzle, number])

  useEffect(() => {
    if (moved.current) heading.current?.focus()
  }, [view])

  const statements = useMemo(() => (puzzle && view < ROUNDS ? arrange(puzzle, view) : []), [puzzle, view])
  const finished = day !== null && view >= ROUNDS
  const roundState = day && view < ROUNDS ? day.rounds[view] : null
  const reviewing = roundState !== null && roundState.status !== 'playing'

  function markTrue() {
    if (!puzzle || !day || !selected) return
    const next = pickInDay(day, puzzle, selected)
    setSelected(null)
    setDay(next)
    saveProgress(number, next.rounds.map((r) => r.picks))
    const outcome = dayOutcome(next, puzzle)
    if (outcome.done) {
      const isNew = !loadStats().results[number]
      setLocalStats(recordResult(number, { fibsCaught: outcome.fibsCaught, cleared: outcome.cleared }))
      if (isNew)
        saved.current = backend
          .recordResult({
            puzzleNumber: number,
            clientId,
            picks: next.rounds.map((r) => r.picks),
            fibsCaught: outcome.fibsCaught,
            readerCaught: outcome.rounds[ROUNDS - 1].caught,
            cleared: outcome.cleared,
          })
          .catch(() => {})
      moved.current = true
      setView(ROUNDS)
    }
  }

  function nextRound() {
    moved.current = true
    setSelected(null)
    setView((v) => v + 1)
  }

  // Desktop: 1 to 4 picks a statement, Enter marks it, Enter again moves on.
  useEffect(() => {
    if (!puzzle || !roundState || finished || page !== 'game') return
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return
      const onPage = target === document.body || target.classList.contains('statement__button') || target.tagName === 'H1' || target.tagName === 'H2'
      if (reviewing) {
        if (e.key === 'Enter' && onPage) {
          e.preventDefault()
          nextRound()
        }
        return
      }
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= statements.length) {
        const s = statements[n - 1]
        if (!roundState!.picks.includes(s.id)) setSelected(s.id)
        return
      }
      if (e.key === 'Enter' && selected && onPage) {
        e.preventDefault()
        markTrue()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const round = puzzle && view < ROUNDS ? puzzle.rounds[view] : null
  const playing = Boolean(round && roundState && !finished && page === 'game')

  return (
    <div className="page" data-playing={playing || undefined}>
      <Masthead
        number={number}
        date={dateForPuzzle(number)}
        streak={stats.streak}
        archive={today > 1 ? { canBack: number > 1, canForward: number < today, onBack: () => setNumber(n => n - 1), onForward: () => setNumber(n => n + 1) } : undefined}
        account={account.available ? { signedIn: player !== null, onOpen: () => openPage('account') } : undefined}
      />
      {fibRan && (
        <div className="fib-ran" role="status">
          Your fib ran today: <em>"{fibRan}"</em>
        </div>
      )}
      <main id="main" className={page === 'account' ? 'paper desk' : 'paper'}>
        {page === 'account' ? (
          <AccountPage account={account} player={player} stats={stats} returnTo={SHARE_URL} onBack={() => openPage('game')} />
        ) : !puzzle || !day ? (
          <p className="loading" role="status">
            Setting today’s type…
          </p>
        ) : finished ? (
          <Summary
            puzzle={puzzle}
            day={day}
            stats={stats}
            backend={backend}
            clientId={clientId}
            headingRef={heading}
            saved={saved.current}
            signedIn={player !== null}
            onSignIn={() => openPage('account')}
          />
        ) : (
          round &&
          roundState && (
            <>
              <header className="lede">
                <h1 ref={heading} tabIndex={-1}>
                  <span className="lede__round">
                    Round {view + 1} of {ROUNDS}, {LEVEL_NAME[round.level]}
                  </span>{' '}
                  {round.theme}
                </h1>
                <p className="deck">
                  Three of these are true and one is a fib. Mark the true ones and leave the fib standing.
                  {round.fib.fromReader && ' This round’s fib was written by a reader.'}
                </p>
              </header>
              <StatementList
                key={view}
                round={round}
                statements={statements}
                state={roundState}
                selected={selected}
                onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
              />
              {reviewing && <RoundVerdict round={round} state={roundState} />}
            </>
          )
        )}
      </main>
      {playing && round && roundState && (
        <ActionBar
          round={view + 1}
          cleared={roundState.picks.filter((id) => id !== round.fib.id).length}
          total={round.truths.length}
          reviewing={reviewing}
          canMark={selected !== null}
          onMark={markTrue}
          onNext={nextRound}
        />
      )}
      <footer className="colophon">
        <p>A new paper every midnight, your time. Facts are checked against the linked sources; tell us if one is wrong.</p>
      </footer>
    </div>
  )
}
