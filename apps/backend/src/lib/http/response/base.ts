import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { TRACE_ID_HEADER } from '../request'
import { getSecurityHeaders } from '../security-headers'

/**
 * Module: base
 *
 * Description: 基础响应处理函数
 *
 * 提供响应头处理和请求流转的核心功能
 */

/**
 * Function: appendTraceIdHeader
 *
 * Description: 为响应添加 TRACE_ID_HEADER
 *
 * Parameters:
 *     res(NextResponse): Next.js 响应对象
 *     traceId(string): 追踪 ID
 *
 * Returns:
 *     res(NextResponse): 添加了 traceId 的响应对象
 */
export function appendTraceIdHeader(res: NextResponse, traceId: string): NextResponse {
  res.headers.set(TRACE_ID_HEADER, traceId)
  return res
}

/**
 * Function: continueRequest
 *
 * Description: 继续处理请求，并传递 TRACE_ID_HEADER
 *
 * Parameters:
 *     req(NextRequest): Next.js 请求对象
 *     traceId(string): 追踪 ID
 *
 * Returns:
 *     res(NextResponse): 继续处理响应对象
 */
export function continueRequest(req: NextRequest, traceId: string): NextResponse {
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set(TRACE_ID_HEADER, traceId)
  const res = NextResponse.next({ request: { headers: requestHeaders } })
  return appendTraceIdHeader(res, traceId)
}

/**
 * Function: appendSecurityHeaders
 *
 * Description: 为响应添加安全响应头（CSP、HSTS 等）
 *
 * Parameters:
 *     res(NextResponse): Next.js 响应对象
 *
 * Returns:
 *     res(NextResponse): 添加了安全头的响应对象
 */
export function appendSecurityHeaders(res: NextResponse): NextResponse {
  const securityHeaders = getSecurityHeaders()
  
  for (const [key, value] of securityHeaders) {
    res.headers.set(key, value)
  }
  
  return res
}
