import type { Action, Scope } from '@/config/access'
/**
 * File: route.ts
 *
 * Description: 管理员 API - 获取指定用户的会话列表
 *
 * HTTP Methods:
 * - GET: 获取指定用户的会话列表（分页）
 */

import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { IdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { SessionListQuerySchema } from '@/contracts/dtos/session.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSessionRepository } from '@/repositories/factory'
import { createSessionService } from '@/services/core/session.service'

/**
 * Function: GET
 *
 * Description: 获取指定用户的会话列表
 *
 * Parameters:
 *   params.id(string): 用户 ID
 *   query.page(number): 页码（默认 1）
 *   query.pageSize(number): 每页数量（默认 20，最大 100）
 *   query.includeRevoked(boolean): 是否包含已撤销的会话（可选）
 *
 * Returns:
 *   SessionListResponse: 会话列表响应（包含 sessions, total, page, pageSize）
 */
export const GET = withV1Route({
  action: 'admin:users:sessions:read',
  requireAccess: { action: 'read' as Action, scope: 'users' as Scope },
  schemas: { params: IdParamsSchema, query: SessionListQuerySchema },
  handler: async ({ serviceContext, params, query, req }) => {
    const sessions = await createSessionRepository()
    const service = createSessionService({ sessions }, serviceContext!)
    const result = await service.getUserSessions({
      userId: params.id,
      includeRevoked: query.includeRevoked ?? false,
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
