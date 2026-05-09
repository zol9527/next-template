import type { Action, Scope } from '@/config/access'
/**
 * File: route.ts
 *
 * Description: 管理员 API - 批量撤销会话
 *
 * HTTP Methods:
 * - POST: 批量撤销多个会话
 */

import type { NextRequest } from 'next/server'

import { ok, fail } from '@/contracts/api-response.schema'
import { BatchRevokeSessionsSchema } from '@/contracts/dtos/session.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSessionRepository } from '@/repositories/factory'
import { createSessionService } from '@/services/core/session.service'

/**
 * Function: POST
 *
 * Description: 批量撤销多个会话
 *
 * Parameters:
 *   body.sessionIds(string[]): 要撤销的会话 ID 列表
 *
 * Returns:
 *   object: 包含撤销状态的对象 { revoked: true, count: number }
 */
export const POST = withV1Route({
  action: 'admin:sessions:delete',
  requireAccess: { action: 'write' as Action, scope: 'sessions' as Scope },
  schemas: { body: BatchRevokeSessionsSchema },
  handler: async ({ serviceContext, body, req }) => {
    // 类型守卫：确保 body 存在（虽然 Zod 校验保证其存在，但 TypeScript 需要运行时检查）
    if (!body) {
      return createJsonApiResponse(req, fail('INVALID_INPUT', 'Missing request body'), { status: 400 })
    }

    const sessions = await createSessionRepository()
    const service = createSessionService({ sessions }, serviceContext!)
    await service.revokeSessions(body.sessionIds)
    return createJsonApiResponse(req, ok({ revoked: true, count: body.sessionIds.length }))
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
