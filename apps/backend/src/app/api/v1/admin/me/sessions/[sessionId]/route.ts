import type { Action, Scope } from '@/config/access'
/**
 * File: route.ts
 *
 * Description: 管理员 API - 撤销当前管理员的指定会话
 *
 * HTTP Methods:
 * - DELETE: 撤销当前管理员的指定会话（仅能撤销自己的会话）
 */

import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { SessionIdParamsSchema } from '@/contracts/dtos/session.dto'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { createSessionRepository, createUserRepository } from '@/repositories/factory'
import { createAdminMeService } from '@/services/core/admin-me.service'

/**
 * Function: DELETE
 *
 * Description: 撤销当前管理员的指定会话（仅能撤销自己的会话）
 *
 * Parameters:
 *	userId(string): 当前登录管理员 ID（自动注入）
 *	params.sessionId(string): 要撤销的会话 ID
 *
 * Returns:
 *	revoked(boolean): 是否撤销成功
 *	sessionId(string): 会话 ID
 */
export const DELETE = withV1Route({
  action: 'admin:me:sessions:revoke',
  requireAccess: { action: 'read' as Action, scope: 'account' as Scope },
  schemas: { params: SessionIdParamsSchema },
  handler: async ({ req, userId, params, serviceContext }) => {
    const users = await createUserRepository()
    const sessions = await createSessionRepository()

    const service = createAdminMeService({ users, sessions }, serviceContext!)
    await service.revokeSession(userId!, params.sessionId)

    return createJsonApiResponse(req, ok({ revoked: true, sessionId: params.sessionId }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
