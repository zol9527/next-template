/**
 * File: src/lib/http/client-detector.ts
 * Description: 客户端类型检测工具，用于区分浏览器客户端与非浏览器客户端（如小程序、移动端 App）。
 *              非浏览器客户端需要通过响应体获取 accessToken / refreshToken，因为它们无法使用 HttpOnly Cookie。
 */

import type { NextRequest } from 'next/server'

/**
 * 判断请求是否来自非浏览器客户端（如微信小程序、移动端 App 等）。
 *
 * 检测策略（按优先级）：
 * 1. 自定义请求头 `X-Client-Type` 存在且值不为 `browser` 时判定为非浏览器客户端
 * 2. User-Agent 包含微信小程序标识（`miniProgram`）时判定为非浏览器客户端
 *    （微信小程序 UA 虽然包含 Mozilla，但不是标准浏览器，需要通过 Body 获取 token）
 * 3. 兜底：User-Agent 不包含主流浏览器关键词（Mozilla、Chrome、Safari、Firefox、Edge）
 *
 * @param req - Next.js 请求对象
 * @returns 是否为非浏览器客户端
 */
export function isNonBrowserClient(req: NextRequest): boolean {
  // 优先通过自定义请求头判断（小程序等客户端可主动设置此头）
  const clientType = req.headers.get('x-client-type')
  if (clientType) {
    return clientType.toLowerCase() !== 'browser'
  }

  // 兜底：User-Agent 判断
  const ua = req.headers.get('user-agent') ?? ''
  if (!ua) return true // 无 UA 视为非浏览器客户端

  // 微信小程序 UA 包含 Mozilla 但也包含 miniProgram，需要优先识别
  if (ua.includes('miniProgram')) return true

  // 主流浏览器 UA 都包含这些关键词
  const browserKeywords = ['Mozilla', 'Chrome', 'Safari', 'Firefox', 'Edge']
  return !browserKeywords.some((keyword) => ua.includes(keyword))
}
