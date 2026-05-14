/**
 * File: not-found.tsx
 * Description: 404 未找到页面 — 当路由不匹配时自动触发
 * 基于 Paper Design System 的 Error Pages — 404 Not Found 设计
 */

import { ErrorPage } from '@/components/ui/error-page'

/**
 * Component: NotFound
 *
 * Description: Next.js App Router 的 not-found 边界
 * 当用户访问不存在的路由时，自动渲染此页面
 *
 * Note: 此页面为 Server Component，但 ErrorPage 内部是 Client Component，
 *       Next.js 会在导入边界自动处理 Server/Client 分割
 */
export default function NotFound() {
  return <ErrorPage type="404" />
}
