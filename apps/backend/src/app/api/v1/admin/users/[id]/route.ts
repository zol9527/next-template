import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok, fail } from '@/contracts/api-response.schema'
import { UpdateUserRequestSchema } from '@/contracts/dtos/admin/users.dto'
import { IdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createUserRepository } from '@/repositories/factory'
import { createAdminUserService } from '@/services/core/admin-user.service'

export const GET = withV1Route({
  action: 'admin:users:read',
  requireAccess: { action: 'read' as Action, scope: 'users' as Scope },
  schemas: { params: IdParamsSchema },
  handler: async ({ serviceContext, params, req, auth }) => {
    // IDOR 防护：管理员不能通过 admin API 访问自己的用户详情
    // 如果需要访问自己的信息，应使用 /api/v1/user/me 或 /api/v1/auth/me
    if (auth && params.id === auth.userId) {
      return createJsonApiResponse(
        req,
        fail('FORBIDDEN', 'Cannot access own user detail via admin API'),
        { status: 403 }
      )
    }

    const users = await createUserRepository()
    const service = createAdminUserService({ users }, serviceContext!)
    const user = await service.getUserDetail(params.id)

    if (!user) {
      return createJsonApiResponse(req, fail('NOT_FOUND', 'Not found'), { status: 404 })
    }

    return createJsonApiResponse(req, ok({ user }))
  },
})

export const PUT = withV1Route({
  action: 'admin:users:write',
  requireAccess: { action: 'write' as Action, scope: 'users' as Scope },
  schemas: { params: IdParamsSchema, body: UpdateUserRequestSchema },
  handler: async ({ serviceContext, params, body, req, userId, auth }) => {
    // IDOR 防护：管理员不能通过 admin API 修改自己的信息
    // 如果需要修改自己的信息，应使用 /api/v1/user/profile 等用户端 API
    if (auth && params.id === auth.userId) {
      return createJsonApiResponse(
        req,
        fail('FORBIDDEN', 'Cannot modify own user detail via admin API'),
        { status: 403 }
      )
    }

    const users = await createUserRepository()
    const service = createAdminUserService({ users }, serviceContext!, userId)

    const user = await service.updateUser(params.id, body!)
    return createJsonApiResponse(req, ok({ user }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
