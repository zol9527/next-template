'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

/**
Function: ThemeToggle

Description: 极简主义风格的明暗主题切换组件
使用太阳和月亮图标进行视觉反馈,支持平滑过渡动画

Parameters:

Returns:
	element(React.ReactElement): 主题切换按钮组件
*/
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // 等待客户端挂载,避免水合不匹配
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        aria-label="切换主题"
      >
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`
        h-9 w-9 relative overflow-hidden
        transition-all duration-200 ease-in-out
        hover:bg-accent
        focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
      `}
      aria-label={isDark ? '切换到亮色模式' : '切换到暗色模式'}
    >
      {/* 太阳图标 - 亮色模式显示 */}
      <Sun
        className={`
          h-4 w-4 transition-all duration-300 ease-in-out
          ${isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}
        `}
      />

      {/* 月亮图标 - 暗色模式显示 */}
      <Moon
        className={`
          absolute h-4 w-4 transition-all duration-300 ease-in-out
          ${!isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}
        `}
      />

      {/* 屏幕阅读器文字 - 隐藏但可被辅助技术读取 */}
      <span className="sr-only">
        {isDark ? '切换到亮色模式' : '切换到暗色模式'}
      </span>
    </Button>
  )
}
