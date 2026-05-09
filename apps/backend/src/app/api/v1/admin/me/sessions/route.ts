import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createAdminMeService } from '@/services/core/admin-me.service'
import { createUserRepository, createSessionRepository } from '@/repositories/factory'

/**
 * GET /api/v1/admin/me/sessions
 *
 * Description: 获取当前管理员的所有登录会话
 */
export const GET = withV1Route({
  action: 'admin:me:sessions:list',
  requireAccess: { action: 'read' as Action, scope: 'account' as Scope },
  handler: async ({ userId, serviceContext, req, auth }) => {
    const users = await createUserRepository()
    const sessions = await createSessionRepository()

    const service = createAdminMeService({ users, sessions }, serviceContext!)
    const sessionsList = await service.getSessions(userId!, auth?.sessionId)

    return createJsonApiResponse(req, ok(sessionsList))
  },
})

/**
 * DELETE /api/v1/admin/me/sessions
 *
 * Description: 撤销当前管理员的所有其他会话
 */
export const DELETE = withV1Route({
  action: 'admin:me:sessions:revoke_all',
  requireAccess: { action: 'read' as Action, scope: 'account' as Scope },
  handler: async ({ userId, serviceContext, req, auth }) => {
    const users = await createUserRepository()
    const sessions = await createSessionRepository()

    const service = createAdminMeService({ users, sessions }, serviceContext!)
    await service.revokeAllOtherSessions(userId!, auth!.sessionId)

    return createJsonApiResponse(req, ok({ message: '已撤销所有其他会话' }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
