import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { appendTraceIdHeader } from './base'
import { appendSetCookieHeaders } from './cookies'
import { createUnauthorizedResponse } from './errors'

/**
 * Module: redirect
 *
 * Description: 重定向相关响应处理函数
 *
 * 提供页面重定向和 token 刷新后的响应处理
 */

/**
 * Function: createRedirectToHome
 *
 * Description: 重定向到首页
 *
 * Parameters:
 *     req(NextRequest): Next.js 请求对象
 *     traceId(string): 追踪 ID
 *
 * Returns:
 *     res(NextResponse): 重定向响应对象
 */
export function createRedirectToHome(req: NextRequest, traceId: string): NextResponse {
  const url = req.nextUrl.clone()
  url.pathname = '/'
  const res = NextResponse.redirect(url)
  return appendTraceIdHeader(res, traceId)
}

/**
 * Function: createRedirectToAdmin
 *
 * Description: 重定向到后台首页
 *
 * Parameters:
 *     req(NextRequest): Next.js 请求对象
 *     traceId(string): 追踪 ID
 *
 * Returns:
 *     res(NextResponse): 重定向响应对象
 */
export function createRedirectToAdmin(req: NextRequest, traceId: string): NextResponse {
  const url = req.nextUrl.clone()
  url.pathname = '/admin'
  const res = NextResponse.redirect(url)
  return appendTraceIdHeader(res, traceId)
}

/**
 * Function: handleRefreshedTokenResponse
 *
 * Description: 处理刷新 token 成功后的响应
 *
 * Parameters:
 *     req(NextRequest): Next.js 请求对象
 *     traceId(string): 追踪 ID
 *     setCookies(string[]): Set-Cookie 头数组
 *     isApi(boolean): 是否为 API 请求
 *
 * Returns:
 *     res(NextResponse): 响应对象
 */
export function handleRefreshedTokenResponse(
  req: NextRequest,
  traceId: string,
  setCookies: string[],
  isApi: boolean,
): NextResponse {
  if (isApi) {
    const res = createUnauthorizedResponse(traceId)
    appendSetCookieHeaders(res, setCookies)
    return res
  }
  const res = NextResponse.redirect(req.nextUrl)
  appendSetCookieHeaders(res, setCookies)
  return appendTraceIdHeader(res, traceId)
}
