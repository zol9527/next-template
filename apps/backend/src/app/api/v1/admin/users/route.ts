import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { AdminUserListQuerySchema } from '@/contracts/dtos/admin/users.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createUserRepository } from '@/repositories/factory'
import { createAdminUserService } from '@/services/core/admin-user.service'

export const GET = withV1Route({
  action: 'admin:users:read',
  requireAccess: { action: 'read' as Action, scope: 'users' as Scope },
  schemas: { query: AdminUserListQuerySchema },
  handler: async ({ serviceContext, query, req }) => {
    const users = await createUserRepository()
    const service = createAdminUserService({ users }, serviceContext!)
    const data = await service.listUsers(query)

    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
