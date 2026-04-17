import { render, screen } from '@testing-library/react'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

describe('Select', () => {
  it('should wrap base select components', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="选择选项" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">选项 1</SelectItem>
          <SelectItem value="2">选项 2</SelectItem>
        </SelectContent>
      </Select>
    )
    expect(screen.getByText('选择选项')).toBeInTheDocument()
  })

  it('should support size prop', () => {
    const { container } = render(
      <Select>
        <SelectTrigger size="lg">
          <SelectValue placeholder="选择" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">选项 1</SelectItem>
        </SelectContent>
      </Select>
    )
    const trigger = container.querySelector('[data-placeholder]') as HTMLElement
    expect(trigger?.className).toContain('h-10')
  })
})
