import { render, screen } from '@testing-library/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

describe('Dialog', () => {
  it('should wrap base dialog components', () => {
    render(
      <Dialog open={true}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>测试标题</DialogTitle>
          </DialogHeader>
          <div>内容</div>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText('测试标题')).toBeInTheDocument()
  })

  it('should support size prop', () => {
    render(
      <Dialog open={true}>
        <DialogContent size="xl" data-testid="dialog-content">
          <DialogHeader>
            <DialogTitle>测试</DialogTitle>
          </DialogHeader>
          内容
        </DialogContent>
      </Dialog>
    )

    // Portal 会渲染到 document.body，所以我们需要在整个 body 中查找
    const dialogContent = screen.getByTestId('dialog-content')
    expect(dialogContent.className).toContain('max-w-[56rem]')
  })
})
