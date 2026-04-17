import { render, screen } from '@testing-library/react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

describe('Popover', () => {
  it('should wrap base popover components', () => {
    render(
      <Popover open={true}>
        <PopoverTrigger>触发器</PopoverTrigger>
        <PopoverContent>弹出内容</PopoverContent>
      </Popover>
    )
    expect(screen.getByText('弹出内容')).toBeInTheDocument()
  })

  it('should support align prop', () => {
    const { container } = render(
      <Popover open={true}>
        <PopoverTrigger>触发器</PopoverTrigger>
        <PopoverContent align="end">内容</PopoverContent>
      </Popover>
    )
    // 检查 PopoverContent 是否正确渲染
    expect(screen.getByText('内容')).toBeInTheDocument()
    // 检查 PopoverTrigger 是否正确渲染
    expect(screen.getByText('触发器')).toBeInTheDocument()
  })
})
