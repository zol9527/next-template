/**
 * File: route.ts
 *
 * Description: 用户 API - 获取当前登录用户的会话列表
 *
 * HTTP Methods:
 * - GET: 获取当前用户的会话列表（分页，不包含已撤销的会话）
 */

import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { SessionListQuerySchema } from '@/contracts/dtos/session.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSessionRepository } from '@/repositories/factory'
import { createSessionService } from '@/services/core/session.service'

/**
 * Function: GET
 *
 * Description: 获取当前登录用户的会话列表
 *
 * Parameters:
 *   userId(string): 当前登录用户 ID（自动注入）
 *   query.page(number): 页码（默认 1）
 *   query.pageSize(number): 每页数量（默认 20，最大 100）
 *
 * Returns:
 *   SessionListResponse: 会话列表响应（包含 sessions, total, page, pageSize）
 */
export const GET = withV1Route({
  action: 'user:sessions:list',
  requireAuth: true,
  schemas: { query: SessionListQuerySchema },
  handler: async ({ userId, serviceContext, query, req }) => {
    const sessions = await createSessionRepository()
    const service = createSessionService({ sessions }, serviceContext!)
    const result = await service.getUserSessions({
      userId,
      includeRevoked: false,
      page: query.page,
      pageSize: query.pageSize,
    })
    return createJsonApiResponse(req, ok(result))
  },
})

/**
 * Function: OPTIONS
 *
 * Description: 处理 CORS 预检请求
 *
 * Parameters:
 *   req(NextRequest): Next.js 请求对象
 *
 * Returns:
 *   NextResponse: CORS 预检响应
 */
export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
