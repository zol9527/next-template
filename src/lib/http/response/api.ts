import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/contracts/api-response.schema'
import { appendCorsHeaders } from './cors'

/**
 * Module: api
 *
 * Description: API 响应创建函数
 *
 * 提供标准化的 API 响应创建功能
 */

/**
 * Function: createJsonApiResponse
 *
 * Description: 创建带有 CORS 头的 JSON API 响应
 *
 * Parameters:
 *     req(NextRequest): Next.js 请求对象
 *     body(ApiResponse<T>): API 响应数据
 *     init(ResponseImage | undefined): 响应初始化选项（状态码等）
 *
 * Returns:
 *     res(NextResponse): JSON 响应对象
 */
export function createJsonApiResponse<T>(
  req: NextRequest,
  body: ApiResponse<T>,
  init?: ResponseInit,
): NextResponse {
  const res = NextResponse.json(body, init)
  return appendCorsHeaders(req, res)
}

/**
 * Function: createOptionsResponse
 *
 * Description: 创建 OPTIONS 预检请求响应
 *
 * Parameters:
 *     req(NextRequest): Next.js 请求对象
 *
 * Returns:
 *     res(NextResponse): 204 No Content 响应对象
 */
export function createOptionsResponse(req: NextRequest): NextResponse {
  const res = new NextResponse(null, { status: 204 })
  return appendCorsHeaders(req, res)
}
