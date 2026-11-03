import React, { useState } from 'react'

const dateFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const HOWTO_KEY = 'fibbed:howto:seen'

function defaultOpen() {
  try {
    return !localStorage.getItem(HOWTO_KEY)
  } catch {
    return false
  }
}

type Props = {
  number: number
  date: Date
  streak?: number
  archive?: { canBack: boolean; canForward: boolean; onBack: () => void; onForward: () => void }
  /** Shown only when accounts are available. */
  account?: { signedIn: boolean; onOpen: () => void }
}

export function Masthead({ number, date, streak, archive, account }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  function handleSummaryClick(e: React.MouseEvent) {
    e.preventDefault()
    const next = !open
    setOpen(next)
    if (!next) {
      try {
        localStorage.setItem(HOWTO_KEY, '1')
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <header className="masthead">
      <div className="masthead__bar">
        <a className="wordmark" href={import.meta.env.BASE_URL} aria-label="Fibbed, today's paper">
          Fibbed
        </a>
        <p className="dateline">
          {archive && (
            <button type="button" className="btn btn--quiet dateline__nav" onClick={archive.onBack} disabled={!archive.canBack} aria-label="Previous paper">
              ←
            </button>
          )}
          <span title="A new paper every day, starting 2 November 2026">No. {number}</span>
          <time dateTime={iso(date)}>{dateFormat.format(date)}</time>
          {archive?.canForward && (
            <button type="button" className="btn btn--quiet dateline__nav" onClick={archive.onForward} aria-label="Next paper">
              →
            </button>
          )}
          {streak != null && streak > 1 && (
            <span className="masthead__streak" title={`${streak}-day streak`} aria-label={`${streak}-day streak`}>
              {streak}
            </span>
          )}
        </p>
        {account && (
          <button type="button" className="btn btn--quiet masthead__account" onClick={account.onOpen}>
            {account.signedIn ? 'Your papers' : 'Sign in'}
          </button>
        )}
      </div>
      <hr className="rule--double" />
      <details className="howto" open={open}>
        <summary onClick={handleSummaryClick}>How to play</summary>
        <ol>
          <li>Three rounds a day, easy to hard. Each has four statements: three true, one fib.</li>
          <li>Select a true statement, then press Mark as true.</li>
          <li>Clear all three truths and the fib is left standing — the round is over.</li>
          <li>On a keyboard, press 1 to 4 to pick a statement and Enter to mark it.</li>
          <li>Afterwards, write a fib for tomorrow's round 3. The editor's pick runs with your name on it.</li>
        </ol>
      </details>
    </header>
  )
}
