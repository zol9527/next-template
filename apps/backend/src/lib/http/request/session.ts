import type { NextRequest } from 'next/server'
import { env } from '@/config'
import { REFRESH_TOKEN_COOKIE } from '@/lib/constants/token'
import { TRACE_ID_HEADER } from './headers'
import { extractSetCookieHeaders } from '@/lib/http'

/**
 * Module: session
 *
 * Description: 会话相关的请求处理
 *
 * 提供会话刷新等中间件级别的会话管理功能
 */

/**
 * Function: tryRefreshSessionByCookie
 *
 * Description: 当 access token 无效但存在 refresh token 时，尝试调用刷新接口获取新的 Cookie
 *
 * Parameters:
 *     req(NextRequest): 当前请求
 *     traceId(string): 当前请求的 traceId
 *
 * Returns:
 *     setCookies(string[] | null): 成功返回 Set-Cookie 头数组；失败返回 null
 */
export async function tryRefreshSessionByCookie(
  req: NextRequest,
  traceId: string,
): Promise<string[] | null> {
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value
  if (!refreshToken) return null

  const cookieHeader = req.headers.get('cookie')
  if (!cookieHeader) return null

  // 安全修复: 使用环境变量配置的内部 URL，不信任请求头
  // 防止攻击者通过伪造 Host/X-Forwarded-Proto 头发起 SSRF 攻击
  const baseUrl = env.INTERNAL_BASE_URL
    ?? `${req.nextUrl.protocol.replace(':', '')}://${req.nextUrl.host}`
  const refreshUrl = new URL('/api/v1/auth/refresh', baseUrl)

  let refreshRes: Response
  try {
    refreshRes = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        cookie: cookieHeader,
        'user-agent': req.headers.get('user-agent') ?? '',
        [TRACE_ID_HEADER]: traceId,
      },
    })
  } catch {
    return null
  }

  if (!refreshRes.ok) return null

  const setCookies = extractSetCookieHeaders(refreshRes)
  if (setCookies.length === 0) return null
  return setCookies
}
