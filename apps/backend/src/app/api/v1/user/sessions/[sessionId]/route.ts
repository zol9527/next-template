/**
 * File: route.ts
 *
 * Description: 用户 API - 撤销当前用户的指定会话
 *
 * HTTP Methods:
 * - DELETE: 撤销当前用户的指定会话（仅能撤销自己的会话）
 */

import type { NextRequest } from 'next/server'

import { ok, fail } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSessionRepository } from '@/repositories/factory'
import { createSessionService } from '@/services/core/session.service'
import { SessionIdParamsSchema } from '@/contracts/dtos/session.dto'

/**
 * Function: DELETE
 *
 * Description: 撤销当前用户的指定会话（仅能撤销自己的会话）
 *
 * Parameters:
 *   userId(string): 当前登录用户 ID（自动注入）
 *   params.sessionId(string): 要撤销的会话 ID
 *
 * Returns:
 *   object: 包含撤销状态的对象 { revoked: true, sessionId: string }
 *   或 403 错误（如果会话不属于当前用户）
 */
export const DELETE = withV1Route({
  action: 'user:sessions:revoke',
  requireAuth: true,
  schemas: { params: SessionIdParamsSchema },
  handler: async ({ userId, serviceContext, params, req }) => {
    const sessions = await createSessionRepository()
    const service = createSessionService({ sessions }, serviceContext!)
    const session = await service.getSessionById(params.sessionId)

    // 权限检查：只能撤销自己的会话
    if (session.userId !== userId) {
      return createJsonApiResponse(req, fail('FORBIDDEN', '无权操作此会话'), { status: 403 })
    }

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
