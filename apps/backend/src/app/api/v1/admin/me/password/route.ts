import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { ChangePasswordSchema } from '@/contracts/dtos/admin/me'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createAdminMeService } from '@/services/core/admin-me.service'
import { createUserRepository, createSessionRepository } from '@/repositories/factory'

/**
 * POST /api/v1/admin/me/password
 *
 * Description: 修改当前管理员的密码
 */
export const POST = withV1Route({
  action: 'admin:me:password:change',
  requireAccess: { action: 'read' as Action, scope: 'account' as Scope },
  schemas: { body: ChangePasswordSchema },
  handler: async ({ userId, serviceContext, body, req }) => {
    const users = await createUserRepository()
    const sessions = await createSessionRepository()

    const service = createAdminMeService({ users, sessions }, serviceContext!)
    await service.changePassword(userId!, body!)

    return createJsonApiResponse(req, ok({ message: '密码修改成功，请重新登录' }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
