import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TextWithAutoLinks from './TextWithAutoLinks'

describe('TextWithAutoLinks', () => {
  it('renderuje link dla URL w tekście', () => {
    render(
      <TextWithAutoLinks text="Zobacz https://example.com/path i reszta" />,
    )
    const link = screen.getByRole('link', { name: /https:\/\/example\.com\/path/ })
    expect(link).toHaveAttribute('href', 'https://example.com/path')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('usuwa końcową interpunkcję z href', () => {
    render(<TextWithAutoLinks text="Link: https://a.pl/x." />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://a.pl/x')
  })
})
