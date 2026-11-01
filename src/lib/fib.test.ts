import { validateFib, validateName, FIB_MIN, FIB_MAX } from './fib'

const truths = ['An octopus has three hearts.']

describe('validateFib', () => {
  it('accepts a plausible sentence', () => {
    expect(validateFib('Octopuses can taste with their suckers and their skin.', truths)).toEqual({
      ok: true,
      value: 'Octopuses can taste with their suckers and their skin.',
    })
  })

  it('trims and collapses whitespace', () => {
    const r = validateFib('  Octopuses   dream in colour every night.  ', truths)
    expect(r).toEqual({ ok: true, value: 'Octopuses dream in colour every night.' })
  })

  it('rejects text that is too short or too long', () => {
    expect(validateFib('Too short', truths)).toMatchObject({ ok: false })
    expect(validateFib('a'.repeat(FIB_MAX + 1), truths)).toMatchObject({ ok: false })
    expect(FIB_MIN).toBeLessThan(FIB_MAX)
  })

  it('rejects links', () => {
    expect(validateFib('See https://example.com for octopus facts today', truths)).toMatchObject({ ok: false })
    expect(validateFib('Visit octopus.com for the best octopus facts', truths)).toMatchObject({ ok: false })
  })

  it('rejects a copy of a true statement', () => {
    expect(validateFib('an octopus has THREE hearts', truths)).toMatchObject({ ok: false })
  })
})

describe('validateName', () => {
  it('allows empty (anonymous)', () => {
    expect(validateName('  ')).toEqual({ ok: true, value: '' })
  })
  it('allows short handles', () => {
    expect(validateName('Sam_K')).toEqual({ ok: true, value: 'Sam_K' })
  })
  it('rejects long or odd handles', () => {
    expect(validateName('x'.repeat(25))).toMatchObject({ ok: false })
    expect(validateName('<script>')).toMatchObject({ ok: false })
  })
})
