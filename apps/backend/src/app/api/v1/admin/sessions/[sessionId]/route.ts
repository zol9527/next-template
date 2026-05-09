import type { Action, Scope } from '@/config/access'
/**
 * File: route.ts
 *
 * Description: 管理员 API - 会话详情和撤销单个会话
 *
 * HTTP Methods:
 * - GET: 获取会话详情
 * - DELETE: 撤销指定会话
 */

import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSessionRepository } from '@/repositories/factory'
import { createSessionService } from '@/services/core/session.service'
import { SessionIdParamsSchema } from '@/contracts/dtos/session.dto'

/**
 * Function: GET
 *
 * Description: 获取会话详情
 *
 * Parameters:
 *   params.sessionId(string): 会话 ID
 *
 * Returns:
 *   object: 包含会话详情的对象
 */
export const GET = withV1Route({
  action: 'admin:sessions:read',
  requireAccess: { action: 'read' as Action, scope: 'sessions' as Scope },
  schemas: { params: SessionIdParamsSchema },
  handler: async ({ serviceContext, params, req }) => {
    const sessions = await createSessionRepository()
    const service = createSessionService({ sessions }, serviceContext!)
    const session = await service.getSessionById(params.sessionId)
    return createJsonApiResponse(req, ok({ session }))
  },
})

/**
 * Function: DELETE
 *
 * Description: 撤销指定会话
 *
 * Parameters:
 *   params.sessionId(string): 会话 ID
 *
 * Returns:
 *   object: 包含撤销状态的对象 { revoked: true, sessionId: string }
 */
export const DELETE = withV1Route({
  action: 'admin:sessions:delete',
  requireAccess: { action: 'write' as Action, scope: 'sessions' as Scope },
  schemas: { params: SessionIdParamsSchema },
  handler: async ({ serviceContext, params, req }) => {
    const sessions = await createSessionRepository()
    const service = createSessionService({ sessions }, serviceContext!)
    await service.revokeSession(params.sessionId)
    return createJsonApiResponse(req, ok({ revoked: true, sessionId: params.sessionId }))
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
