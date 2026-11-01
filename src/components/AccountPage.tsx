import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { Account, Player } from '../lib/backend'
import { dateForPuzzle } from '../lib/date'
import { ROUNDS } from '../lib/game'
import type { Stats } from '../lib/stats'
import { BoxScore } from './BoxScore'

type Props = {
  account: Account
  player: Player | null
  stats: Stats
  returnTo: string
  onBack: () => void
}

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function AccountPage({ account, player, stats, returnTo, onBack }: Props) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [player])

  return (
    <>
      <div className="desk__bar">
        <button type="button" className="btn btn--quiet" onClick={onBack}>
          Back to today’s paper
        </button>
      </div>
      {player ? (
        <Papers heading={heading} account={account} player={player} stats={stats} />
      ) : (
        <SignIn heading={heading} account={account} returnTo={returnTo} />
      )}
    </>
  )
}

function SignIn({ heading, account, returnTo }: { heading: React.RefObject<HTMLHeadingElement | null>; account: Account; returnTo: string }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const id = useId()
  const input = useRef<HTMLInputElement>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const address = email.trim()
    if (!EMAIL.test(address)) {
      setError('Enter an email address, like you@example.com.')
      input.current?.focus()
      return
    }
    setError(null)
    setBusy(true)
    const r = await account.sendLink(address, returnTo)
    setBusy(false)
    if (r.ok) setSentTo(address)
    else setError(r.error)
  }

  return (
    <section className="account">
      <header className="lede">
        <h1 ref={heading} tabIndex={-1}>
          Keep your streak on every device
        </h1>
        <p className="deck">Sign in with your email and your results follow you, with every paper you have played.</p>
      </header>
      {sentTo ? (
        <p className="account__sent" role="status">
          Check your inbox at {sentTo}. Open the link on this device and you are signed in. No password needed.
        </p>
      ) : (
        <form className="write__form" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor={id}>Email</label>
            <input
              id={id}
              ref={input}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? true : undefined}
            />
          </div>
          <p className="field__error" role="alert">
            {error}
          </p>
          <button type="submit" className="btn btn--primary" disabled={busy} aria-busy={busy || undefined}>
            {busy ? 'Sending…' : 'Email me a sign-in link'}
          </button>
          <p className="field__help">Results you played on this device come with you when you sign in.</p>
        </form>
      )}
    </section>
  )
}

function Papers({
  heading,
  account,
  player,
  stats,
}: {
  heading: React.RefObject<HTMLHeadingElement | null>
  account: Account
  player: Player
  stats: Stats
}) {
  const days = Object.keys(stats.results)
    .map(Number)
    .sort((a, b) => b - a)
  return (
    <section className="account">
      <header className="lede">
        <h1 ref={heading} tabIndex={-1}>
          Your papers
        </h1>
        <p className="dateline">
          <span>Signed in as</span>
          <span>{player.email}</span>
        </p>
      </header>
      <BoxScore stats={stats} />
      {days.length === 0 ? (
        <p className="desk__empty">No papers yet. Today’s is waiting.</p>
      ) : (
        <table className="papers" aria-label="Past papers">
          <thead>
            <tr>
              <th scope="col">Paper</th>
              <th scope="col">Date</th>
              <th scope="col">Fibs caught</th>
              <th scope="col" className="num">
                Score
              </th>
            </tr>
          </thead>
          <tbody>
            {days.map((n) => {
              const r = stats.results[n]
              return (
                <tr key={n} data-perfect={r.fibsCaught === ROUNDS || undefined}>
                  <th scope="row">No. {n}</th>
                  <td>{dateFormat.format(dateForPuzzle(n))}</td>
                  <td>
                    {r.fibsCaught} of {ROUNDS}
                  </td>
                  <td className="num agate">{r.cleared + r.fibsCaught}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <button type="button" className="btn btn--secondary" onClick={() => account.signOut()}>
        Sign out
      </button>
    </section>
  )
}
