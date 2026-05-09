import { render } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'

describe('Badge', () => {
  it('should wrap base badge component', () => {
    const { container } = render(<Badge variant="default">测试</Badge>)
    const badge = container.firstChild as HTMLElement
    expect(badge).toBeTruthy()
    expect(badge.className).toContain('bg-primary')
  })

  it('should support color roles', () => {
    const { container } = render(<Badge variant="success">成功</Badge>)
    const badge = container.firstChild as HTMLElement
    expect(badge).toBeTruthy()
    expect(badge.className).toContain('bg-success/10')
  })

  it('should support business status', () => {
    const { container } = render(<Badge status="published">已发布</Badge>)
    const badge = container.firstChild as HTMLElement
    expect(badge).toBeTruthy()
    expect(badge.className).toContain('bg-success/10')
  })
})
