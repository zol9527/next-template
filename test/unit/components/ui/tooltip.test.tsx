import { render, screen } from '@testing-library/react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

describe('Tooltip', () => {
  it('should wrap base tooltip components', () => {
    render(
      <TooltipProvider>
        <Tooltip open={true}>
          <TooltipTrigger>悬停我</TooltipTrigger>
          <TooltipContent>提示内容</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(screen.getAllByText('提示内容')).toHaveLength(2)
  })
})
