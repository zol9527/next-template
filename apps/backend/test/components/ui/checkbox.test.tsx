import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Checkbox } from '@/components/ui/checkbox'

describe('Checkbox', () => {
  it('should wrap base checkbox component', () => {
    const { container } = render(<Checkbox color="success" />)
    const checkbox = container.querySelector('[data-state]') as HTMLElement
    expect(checkbox).toBeTruthy()
  })

  it('should support color roles', () => {
    const { container } = render(<Checkbox color="error" />)
    const checkbox = container.querySelector('[data-state]') as HTMLElement
    expect(checkbox).toBeTruthy()
  })

  it('should forward refs correctly', () => {
    const ref = { current: null }
    render(<Checkbox ref={ref as any} />)
    expect(ref.current).toBeTruthy()
  })
})
