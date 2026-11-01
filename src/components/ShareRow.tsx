import { useState } from 'react'

type Props = { resultText: string; url: string }

const enc = encodeURIComponent

export const inviteText = (url: string) =>
  `Try Fibbed, a daily game. Three rounds a day, four statements each, and one is made up. Can you spot the fibs?\n${url}`

async function shareOrCopy(text: string): Promise<'shared' | 'copied' | 'cancelled'> {
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'cancelled'
    }
  }
  await navigator.clipboard.writeText(text)
  return 'copied'
}

export function ShareRow({ resultText, url }: Props) {
  const [status, setStatus] = useState<string | null>(null)

  async function run(text: string, copied: string) {
    try {
      const r = await shareOrCopy(text)
      if (r === 'shared') setStatus('Shared.')
      if (r === 'copied') setStatus(copied)
    } catch {
      setStatus('Could not copy. Long-press to select the text instead.')
    }
  }

  // The result text already ends with the link, so most services get just the text.
  const links = [
    { name: 'X', href: `https://x.com/intent/post?text=${enc(resultText)}` },
    { name: 'WhatsApp', href: `https://wa.me/?text=${enc(resultText)}` },
    { name: 'Bluesky', href: `https://bsky.app/intent/compose?text=${enc(resultText)}` },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
  ]

  return (
    <section className="share" aria-label="Share">
      <div className="share__actions">
        <button type="button" className="btn btn--primary" onClick={() => run(resultText, 'Copied. Paste it anywhere.')}>
          Share result
        </button>
        <button type="button" className="btn btn--secondary" onClick={() => run(inviteText(url), 'Invite copied. Send it to a friend.')}>
          Invite a friend
        </button>
      </div>
      <p className="share__to">
        <span>Or post it to</span>
        {links.map((l) => (
          <a key={l.name} href={l.href} target="_blank" rel="noreferrer">
            {l.name}
          </a>
        ))}
      </p>
      <p className="share__status" role="status">
        {status}
      </p>
    </section>
  )
}
