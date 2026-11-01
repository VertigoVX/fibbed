import { useCallback, useEffect, useId, useState, type FormEvent, type MouseEvent } from 'react'
import { getPuzzle } from '../data/puzzles'
import { dateForPuzzle, puzzleNumberFor } from '../lib/date'
import type { DayCounts, EditorApi, EditorFib, FibStatus } from './editorApi'

type Props = { api: EditorApi; now?: Date }
type Phase = 'loading' | 'signedOut' | 'notEditor' | 'desk'

const dayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
const timeFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const STATUS_LABEL: Record<FibStatus, string> = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }

function dayFromUrl(fallback: number) {
  const n = Number(new URLSearchParams(window.location.search).get('day'))
  return Number.isInteger(n) && n >= 1 ? n : fallback
}

export function Moderate({ api, now = new Date() }: Props) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [email, setEmail] = useState('')

  const check = useCallback(async () => {
    const s = await api.session()
    if (!s) return setPhase('signedOut')
    setEmail(s.email)
    setPhase((await api.isEditor()) ? 'desk' : 'notEditor')
  }, [api])

  useEffect(() => {
    void check().catch(() => setPhase('signedOut'))
  }, [check])

  async function signOut() {
    await api.signOut()
    setPhase('signedOut')
  }

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead__bar">
          <a className="wordmark" href={import.meta.env.BASE_URL}>
            Fibbed
          </a>
          <p className="dateline">
            <span>Editor’s desk</span>
            {phase === 'desk' || phase === 'notEditor' ? <span>{email}</span> : null}
          </p>
        </div>
        <hr className="rule--double" />
      </header>
      <main className="paper desk">
        {phase === 'loading' && (
          <p className="loading" role="status">
            Checking your sign-in…
          </p>
        )}
        {phase === 'signedOut' && <SignIn api={api} onSignedIn={check} />}
        {phase === 'notEditor' && (
          <section className="desk__notice">
            <h1>Editors only</h1>
            <p className="lead">You are signed in as {email}, but this account is not on the editors list yet.</p>
            <p>In Supabase, open the SQL editor and run:</p>
            <pre>
              <code>{`insert into public.editors (user_id)\nselect id from auth.users where email = '${email}';`}</code>
            </pre>
            <button type="button" className="btn btn--secondary" onClick={signOut}>
              Sign out
            </button>
          </section>
        )}
        {phase === 'desk' && <Desk api={api} now={now} onSignOut={signOut} />}
      </main>
    </div>
  )
}

function SignIn({ api, onSignedIn }: { api: EditorApi; onSignedIn: () => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ids = { email: useId(), password: useId() }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const r = await api.signIn(email.trim(), password)
    setBusy(false)
    if (r.ok) await onSignedIn()
    else setError(r.error)
  }

  return (
    <section className="desk__signin">
      <h1>Sign in to moderate</h1>
      <p className="lead">For editors only. Players never need an account.</p>
      <form className="write__form" onSubmit={submit}>
        <div className="field">
          <label htmlFor={ids.email}>Email</label>
          <input id={ids.email} type="email" name="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor={ids.password}>Password</label>
          <input id={ids.password} type="password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <p className="field__error" role="alert">
          {error}
        </p>
        <button type="submit" className="btn btn--primary" disabled={busy} aria-busy={busy || undefined}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </section>
  )
}

function Desk({ api, now, onSignOut }: { api: EditorApi; now: Date; onSignOut: () => void }) {
  const tomorrow = puzzleNumberFor(now) + 1
  const [day, setDayState] = useState(() => dayFromUrl(tomorrow))
  const [fibs, setFibs] = useState<EditorFib[] | null>(null)
  const [counts, setCounts] = useState<DayCounts>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Player fibs run in round 3, the reader round.
  const reader = getPuzzle(day).rounds[2]

  const load = useCallback(async () => {
    try {
      const [f, c] = await Promise.all([api.fibs(day), api.counts()])
      setFibs(f)
      setCounts(c)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
      setFibs((cur) => cur ?? [])
    }
  }, [api, day])

  useEffect(() => {
    setFibs(null)
    void load()
  }, [load])

  function setDay(n: number) {
    const next = Math.max(1, n)
    setDayState(next)
    setNotice(null)
    setError(null)
    window.history.replaceState(null, '', `?day=${next}`)
  }

  async function act(run: () => Promise<void>, done: string) {
    setBusy(true)
    setNotice(null)
    setError(null)
    try {
      await run()
      setNotice(done)
      await load()
    } catch (e) {
      setError(`That didn’t go through. ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const running = fibs?.find((f) => f.featured) ?? null
  const ordered = [...(fibs ?? [])].sort((a, b) => rank(a) - rank(b) || a.createdAt.localeCompare(b.createdAt))
  const waiting = Object.entries(counts)
    .map(([n, c]) => ({ n: Number(n), pending: c.pending }))
    .filter((d) => d.pending > 0 && d.n !== day)
    .sort((a, b) => a.n - b.n)

  return (
    <>
      <div className="desk__bar">
        <nav className="desk__days" aria-label="Day">
          <button type="button" className="btn btn--secondary" onClick={() => setDay(day - 1)} disabled={day <= 1}>
            Previous day
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => setDay(day + 1)}>
            Next day
          </button>
        </nav>
        <button type="button" className="btn btn--quiet" onClick={onSignOut}>
          Sign out
        </button>
      </div>

      <header className="lede">
        <h1>
          <span className="desk__dayline">
            No. {day}, {dayFormat.format(dateForPuzzle(day))}
            {day === tomorrow ? ' (tomorrow)' : ''}, round 3
          </span>{' '}
          {reader.theme}
        </h1>
      </header>

      <div className="desk__columns">
        <div className="desk__main">
          <section className="desk__running" aria-labelledby="running-head">
            <h2 id="running-head">Running on this day</h2>
            {running ? (
              <>
                <p className="desk__quote">{running.text}</p>
                <p className="desk__meta">by {running.author ?? 'an anonymous player'}</p>
                <button
                  type="button"
                  className="btn btn--secondary"
                  disabled={busy}
                  onClick={() => act(() => api.useHouseFib(day), `Back to the house fib on No. ${day}.`)}
                >
                  Use the house fib
                </button>
              </>
            ) : (
              <>
                <p className="desk__quote">{reader.fib.text}</p>
                <p className="desk__meta">House fib. It runs unless you pick a player’s fib below.</p>
              </>
            )}
          </section>

          <p className="desk__status" role="status">
            {notice}
          </p>
          <p className="field__error" role="alert">
            {error}
          </p>

          <section aria-labelledby="sent-head">
            <h2 id="sent-head">Submitted fibs</h2>
            {fibs === null ? (
              <p className="loading">Loading fibs…</p>
            ) : ordered.length === 0 ? (
              <p className="desk__empty">No fibs sent for this day yet.</p>
            ) : (
              <ol className="desk__fibs" aria-label="Submitted fibs">
                {ordered.map((f) => (
                  <li key={f.id} className="desk__fib" data-status={f.status} data-featured={f.featured || undefined}>
                    <p className="desk__fibtext">{f.text}</p>
                    <p className="desk__meta">
                      <span>{f.author ?? 'Anonymous'}</span>
                      <time dateTime={f.createdAt}>{timeFormat.format(new Date(f.createdAt))}</time>
                      <span className="desk__label">{f.featured ? 'Running' : STATUS_LABEL[f.status]}</span>
                    </p>
                    <div className="desk__actions">
                      {!f.featured && (
                        <button
                          type="button"
                          className="btn btn--secondary"
                          disabled={busy}
                          onClick={() => act(() => api.feature(f.id), `Running ${f.author ? `${f.author}’s` : 'an anonymous'} fib on No. ${day}.`)}
                        >
                          Run this fib
                        </button>
                      )}
                      {f.status === 'rejected' ? (
                        <button type="button" className="btn btn--quiet" disabled={busy} onClick={() => act(() => api.setStatus(f.id, 'pending'), 'Restored to pending.')}>
                          Restore
                        </button>
                      ) : (
                        <button type="button" className="btn btn--quiet" disabled={busy} onClick={() => act(() => api.setStatus(f.id, 'rejected'), 'Rejected.')}>
                          Reject
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="desk__side" aria-labelledby="waiting-head">
          <h2 id="waiting-head">Other days with fibs waiting</h2>
          {waiting.length === 0 ? (
            <p className="desk__empty">Nothing waiting on other days.</p>
          ) : (
            <ul className="desk__waiting">
              {waiting.map((d) => (
                <li key={d.n}>
                  <a
                    href={`?day=${d.n}`}
                    onClick={(e: MouseEvent) => {
                      e.preventDefault()
                      setDay(d.n)
                    }}
                  >
                    No. {d.n}, {getPuzzle(d.n).rounds[2].theme}
                    <span className="agate">{d.pending} waiting</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </>
  )
}

const rank = (f: EditorFib) => (f.featured ? 0 : f.status === 'pending' ? 1 : f.status === 'approved' ? 2 : 3)
