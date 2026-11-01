export const FIB_MIN = 20
export const FIB_MAX = 140
export const NAME_MAX = 24

export type Validation = { ok: true; value: string } | { ok: false; error: string }

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export function validateFib(input: string, truths: string[]): Validation {
  const value = input.replace(/\s+/g, ' ').trim()
  if (value.length < FIB_MIN) return { ok: false, error: `Make it at least ${FIB_MIN} characters, so it can pass for a fact.` }
  if (value.length > FIB_MAX) return { ok: false, error: `Keep it under ${FIB_MAX} characters.` }
  if (/https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co|app|xyz|ly)\b/i.test(value))
    return { ok: false, error: 'No links, please.' }
  if (truths.some((t) => normalise(t) === normalise(value)))
    return { ok: false, error: 'That one is actually true. Invent something.' }
  return { ok: true, value }
}

export function validateName(input: string): Validation {
  const value = input.trim()
  if (value.length > NAME_MAX) return { ok: false, error: `Up to ${NAME_MAX} characters.` }
  if (value && !/^[\p{L}\p{N} _.-]+$/u.test(value)) return { ok: false, error: 'Letters, numbers, spaces, dots, dashes and underscores only.' }
  return { ok: true, value }
}
