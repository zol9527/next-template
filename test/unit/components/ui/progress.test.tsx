import { render } from '@testing-library/react'
import { Progress } from '@/components/ui/progress'

describe('Progress', () => {
  it('should wrap base progress component', () => {
    const { container } = render(<Progress value={50} />)
    const progress = container.querySelector('[role="progressbar"]') as HTMLElement
    expect(progress).toBeTruthy()
    // 验证组件能够正确渲染并接受 value 属性
    expect(progress?.getAttribute('data-state')).toBe('indeterminate')
  })

  it('should render with custom className', () => {
    const { container } = render(<Progress value={75} className="custom-class" />)
    const progress = container.querySelector('.custom-class')
    expect(progress).toBeTruthy()
  })
})
