import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok, fail } from '@/contracts/api-response.schema'
import { IdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createUserRepository, createSessionRepository } from '@/repositories/factory'
import { createAdminUserService } from '@/services/core/admin-user.service'

export const POST = withV1Route({
  action: 'admin:users:revoke_sessions',
  requireAccess: { action: 'write' as Action, scope: 'users' as Scope },
  schemas: { params: IdParamsSchema },
  handler: async ({ serviceContext, params, req }) => {
    const [users, sessions] = await Promise.all([
      createUserRepository(),
      createSessionRepository(),
    ])

    const service = createAdminUserService({
      users,
      sessions,
    }, serviceContext!)

    const user = await service.revokeUserSessions(params.id)

    if (!user) {
      return createJsonApiResponse(req, fail('NOT_FOUND', 'Not found'), { status: 404 })
    }

    return createJsonApiResponse(req, ok({ user }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
