import { NextResponse } from 'next/server'
import { appendTraceIdHeader } from './base'

/**
 * Module: errors
 *
 * Description: HTTP 错误响应创建函数
 *
 * 提供标准化的错误响应创建功能
 */

/**
 * Function: createUnauthorizedResponse
 *
 * Description: 创建 401 UNAUTHORIZED 响应
 *
 * Parameters:
 *     traceId(string): 追踪 ID
 *
 * Returns:
 *     res(NextResponse): 401 响应对象
 */
export function createUnauthorizedResponse(traceId: string): NextResponse {
  const res = NextResponse.json(
    { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
    { status: 401 },
  )
  return appendTraceIdHeader(res, traceId)
}

/**
 * Function: createForbiddenResponse
 *
 * Description: 创建 403 FORBIDDEN 响应
 *
 * Parameters:
 *     traceId(string): 追踪 ID
 *
 * Returns:
 *     res(NextResponse): 403 响应对象
 */
export function createForbiddenResponse(traceId: string): NextResponse {
  const res = NextResponse.json(
    { success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } },
    { status: 403 },
  )
  return appendTraceIdHeader(res, traceId)
}

/**
 * Function: createTooManyRequestsResponse
 *
 * Description: 创建 429 TOO MANY REQUESTS 响应
 *
 * Parameters:
 *     traceId(string): 追踪 ID
 *     retryAfterSeconds(number): 重试等待秒数
 *
 * Returns:
 *     res(NextResponse): 429 响应对象
 */
export function createTooManyRequestsResponse(traceId: string, retryAfterSeconds: number): NextResponse {
  const res = NextResponse.json(
    { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests' } },
    { status: 429 },
  )
  res.headers.set('Retry-After', String(retryAfterSeconds))
  return appendTraceIdHeader(res, traceId)
}
