import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { getPuzzle } from '../data/puzzles'
import type { Backend } from '../lib/backend'
import { dateForPuzzle } from '../lib/date'
import { FIB_MAX, validateFib, validateName } from '../lib/fib'

type Props = { number: number; backend: Backend; clientId: string }

const dayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

export function FibForm({ number, backend, clientId }: Props) {
  const tomorrow = getPuzzle(number).rounds[2]
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<{ field: 'text' | 'name' | 'form'; message: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const ids = { text: useId(), name: useId(), error: useId(), count: useId() }

  useEffect(() => {
    let live = true
    backend.getSubmittedFib(number).then((s) => live && s && setSent(s))
    return () => {
      live = false
    }
  }, [backend, number])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const fib = validateFib(text, tomorrow.truths.map((t) => t.text))
    if (!fib.ok) {
      setError({ field: 'text', message: fib.error })
      textRef.current?.focus()
      return
    }
    const who = validateName(name)
    if (!who.ok) {
      setError({ field: 'name', message: who.error })
      nameRef.current?.focus()
      return
    }
    setError(null)
    setBusy(true)
    const r = await backend.submitFib({ puzzleNumber: number, text: fib.value, author: who.value, clientId })
    setBusy(false)
    if (r.ok) setSent(fib.value)
    else setError({ field: 'form', message: r.error })
  }

  const day = dayFormat.format(dateForPuzzle(number))

  return (
    <section className="write" aria-labelledby="write-head">
      <hr className="rule--double" />
      <h2 id="write-head">Tomorrow’s round 3: {tomorrow.theme}</h2>
      {sent ? (
        <div className="write__sent" role="status">
          <p className="write__quote">“{sent}”</p>
          <p>
            {backend.online
              ? `Filed. If the editor picks it, it runs on ${day} with your name on it.`
              : 'Saved only on this device. Fibs reach other players once the game’s server is switched on.'}
          </p>
        </div>
      ) : (
        <form className="write__form" onSubmit={submit} noValidate>
          <p className="lead">Write a fib about {tomorrow.theme.toLowerCase()}. The editor picks one to run in round 3 tomorrow, with its writer’s name on it.</p>
          <div className="field">
            <label htmlFor={ids.text}>Your fib</label>
            <textarea
              id={ids.text}
              ref={textRef}
              name="fib"
              rows={3}
              maxLength={FIB_MAX + 20}
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-invalid={error?.field === 'text' || undefined}
              aria-describedby={`${ids.count} ${error?.field === 'text' ? ids.error : ''}`.trim()}
            />
            <p id={ids.count} className="field__help">
              <span className="agate">{text.trim().length}</span> of {FIB_MAX} characters. Make it sound like it could be true.
            </p>
          </div>
          <div className="field">
            <label htmlFor={ids.name}>Name for the credit (optional)</label>
            <input
              id={ids.name}
              ref={nameRef}
              name="nickname"
              autoComplete="nickname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={error?.field === 'name' || undefined}
              aria-describedby={error?.field === 'name' ? ids.error : undefined}
            />
          </div>
          <p id={ids.error} className="field__error" role="alert">
            {error?.message}
          </p>
          <button type="submit" className="btn btn--secondary" aria-busy={busy || undefined} disabled={busy}>
            {busy ? 'Sending…' : 'Send fib'}
          </button>
        </form>
      )}
    </section>
  )
}
