import { render, screen } from '@testing-library/react'
import { Switch } from '@/components/ui/switch'

describe('Switch', () => {
  it('should wrap base switch component', () => {
    const { container } = render(<Switch color="success" />)
    const switchEl = container.querySelector('[data-state]') as HTMLElement
    expect(switchEl).toBeTruthy()
  })

  it('should support color roles', () => {
    const { container } = render(<Switch color="error" />)
    const switchEl = container.querySelector('[data-state]') as HTMLElement
    expect(switchEl).toBeTruthy()
  })
})
