import { render, screen } from '@testing-library/react'
import { Masthead } from './Masthead'

const baseProps = {
  number: 1,
  date: new Date(2026, 10, 2), // 2 Nov 2026 — launch day, not election day
}

it('has no election class on a normal day', () => {
  render(<Masthead {...baseProps} />)
  expect(screen.getByRole('link', { name: /Fibbed/ })).not.toHaveClass('wordmark--election')
})

it('adds election class on 4 November 2026', () => {
  render(<Masthead {...baseProps} number={3} date={new Date(2026, 10, 4)} />)
  expect(screen.getByRole('link', { name: /Fibbed/ })).toHaveClass('wordmark--election')
})
