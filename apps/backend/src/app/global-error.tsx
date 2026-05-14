/**
 * File: global-error.tsx
 * Description: 全局错误边界 — 捕获根布局中的未处理错误
 * 基于 Paper Design System 的 Error Pages — 500 Server Error 设计
 *
 * Important: global-error 会替换根布局，因此必须自带 <html> 和 <body> 标签
 */

'use client'

import { ErrorPage } from '@/components/ui/error-page'

/**
 * Component: GlobalError
 *
 * Description: Next.js App Router 的全局错误边界
 * 当根布局 (layout.tsx) 中发生未捕获的错误时触发，
 * 替换整个页面内容（包括根布局），因此需要自行提供 HTML 结构
 *
 * Props:
 *     error(Error & { digest?: string }): 捕获的错误对象
 *     reset(() => void): 重试函数
 *
 * Note:
 *     - 必须是 Client Component（'use client'）
 *     - 必须定义自己的 <html> 和 <body> 标签
 *     - globals.css 的样式仍可通过构建产物加载
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // 在开发环境下打印错误信息，便于调试
  if (process.env.NODE_ENV === 'development') {
    console.error('[Global Error Boundary]', error)
  }

  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <ErrorPage type="500" reset={reset} />
      </body>
    </html>
  )
}
