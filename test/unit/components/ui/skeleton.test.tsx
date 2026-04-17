import { render } from '@testing-library/react'
import { Skeleton } from '@/components/ui/skeleton'

describe('Skeleton', () => {
  it('should wrap base skeleton component', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toBeTruthy()
    expect(skeleton.className).toContain('animate-pulse')
  })
})
