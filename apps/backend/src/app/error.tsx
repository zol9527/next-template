/**
 * File: error.tsx
 * Description: 通用错误边界 — 捕获路由段内的运行时错误
 * 基于 Paper Design System 的 Error Pages — General Error 设计
 */

'use client'

import { ErrorPage } from '@/components/ui/error-page'

/**
 * Component: Error
 *
 * Description: Next.js App Router 的 error 边界
 * 当路由段内发生运行时错误时自动渲染，提供重试能力
 *
 * Props:
 *     error(Error & { digest?: string }): 捕获的错误对象
 *     reset(() => void): 重试函数，重新执行失败的渲染
 *
 * Note: 必须是 Client Component（'use client'）
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // 在开发环境下打印错误信息，便于调试
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Boundary]', error)
  }

  return <ErrorPage type="general" reset={reset} />
}
