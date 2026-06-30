import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ChangePill } from '@/components/live/ChangePill'

// U+2212 minus, matching @/lib/format.
const MINUS = '−'

describe('ChangePill', () => {
  it('renders a positive change with a plus sign and the up color', () => {
    render(<ChangePill value={2.5} />)
    const el = screen.getByText('+2.50%')
    expect(el).toBeInTheDocument()
    expect(el).toHaveClass('text-up')
    expect(el).not.toHaveClass('text-down')
  })

  it('renders a negative change with the U+2212 minus and the down color', () => {
    render(<ChangePill value={-1.2} />)
    const el = screen.getByText(`${MINUS}1.20%`)
    expect(el).toBeInTheDocument()
    expect(el).toHaveClass('text-down')
    expect(el).not.toHaveClass('text-up')
    // The signed percent must use the real minus, not an ASCII hyphen.
    expect(el.textContent).toContain(MINUS)
    expect(el.textContent).not.toContain('-')
  })

  it('treats zero as a non-negative (up) value', () => {
    render(<ChangePill value={0} />)
    const el = screen.getByText('0.00%')
    expect(el).toHaveClass('text-up')
  })

  it('falls back to 0.00% for nullish input', () => {
    render(<ChangePill value={null} />)
    expect(screen.getByText('0.00%')).toBeInTheDocument()
  })
})
