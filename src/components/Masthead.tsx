const dateFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function Masthead({ number, date }: { number: number; date: Date }) {
  return (
    <header className="masthead">
      <div className="masthead__bar">
        <a className="wordmark" href="/" aria-label="Fibbed, today’s paper">
          Fibbed
        </a>
        <p className="dateline">
          <span>No. {number}</span>
          <time dateTime={iso(date)}>{dateFormat.format(date)}</time>
        </p>
      </div>
      <hr className="rule--double" />
      <details className="howto">
        <summary>How to play</summary>
        <ol>
          <li>Five statements, one theme. Four are true; one is a fib.</li>
          <li>Tap a statement you trust, then press Mark as true.</li>
          <li>Clear all four truths to catch the fib. Mark the fib and you are out.</li>
          <li>On a keyboard, press 1 to 5 to pick a statement and Enter to mark it.</li>
          <li>Afterwards, write a fib for tomorrow. The best one runs, with your name on it.</li>
        </ol>
      </details>
    </header>
  )
}
