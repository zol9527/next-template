import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { IdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createUserRepository, createSessionRepository } from '@/repositories/factory'
import { createAdminUserService } from '@/services/core/admin-user.service'

export const POST = withV1Route({
  action: 'admin:users:write',
  requireAccess: { action: 'write' as Action, scope: 'users' as Scope },
  schemas: { params: IdParamsSchema },
  handler: async ({ serviceContext, userId, params, req }) => {
    const [users, sessions] = await Promise.all([
      createUserRepository(),
      createSessionRepository(),
    ])

    const service = createAdminUserService({
      users,
      sessions,
    }, serviceContext!, userId!)

    const result = await service.disableUser(params.id)
    return createJsonApiResponse(req, ok(result))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
