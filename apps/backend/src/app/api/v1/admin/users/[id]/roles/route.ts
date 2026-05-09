import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { IdParamsSchema } from '@/contracts/dtos/route-params.dto'
import {
  AdminAssignUserRoleRequestSchema,
  AdminRemoveUserRoleRequestSchema,
  AdminSetUserRolesRequestSchema,
} from '@/contracts/dtos/admin/user-roles.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createUserRepository, createRbacRepository } from '@/repositories/factory'
import { createAdminUserRoleService } from '@/services/core/admin-user-role.service'

export const GET = withV1Route({
  action: 'admin:users:read',
  requireAccess: { action: 'read' as Action, scope: 'users' as Scope },
  schemas: { params: IdParamsSchema },
  handler: async ({ serviceContext, params, req }) => {
    const [users, rbac] = await Promise.all([
      createUserRepository(),
      createRbacRepository(),
    ])

    const service = createAdminUserRoleService({
      users,
      rbac,
    }, serviceContext!)

    const result = await service.listUserRoles(params.id)
    return createJsonApiResponse(req, ok(result))
  },
})

export const POST = withV1Route({
  action: 'admin:users:write',
  requireAccess: { action: 'write' as Action, scope: 'users' as Scope },
  schemas: { params: IdParamsSchema, body: AdminAssignUserRoleRequestSchema },
  handler: async ({ serviceContext, userId, params, body, req }) => {
    const [users, rbac] = await Promise.all([
      createUserRepository(),
      createRbacRepository(),
    ])

    const service = createAdminUserRoleService({
      users,
      rbac,
    }, serviceContext!)

    const result = await service.assignRoleToUser({
      userId: params.id,
      roleId: body!.roleId,
      actorUserId: userId!,
    })
    return createJsonApiResponse(req, ok(result))
  },
})

export const DELETE = withV1Route({
  action: 'admin:users:write',
  requireAccess: { action: 'write' as Action, scope: 'users' as Scope },
  schemas: { params: IdParamsSchema, body: AdminRemoveUserRoleRequestSchema },
  handler: async ({ serviceContext, userId, params, body, req }) => {
    const [users, rbac] = await Promise.all([
      createUserRepository(),
      createRbacRepository(),
    ])

    const service = createAdminUserRoleService({
      users,
      rbac,
    }, serviceContext!)

    const result = await service.removeRoleFromUser({
      userId: params.id,
      roleId: body!.roleId,
      actorUserId: userId!,
    })
    return createJsonApiResponse(req, ok(result))
  },
})

export const PUT = withV1Route({
  action: 'admin:users:write',
  requireAccess: { action: 'write' as Action, scope: 'users' as Scope },
  schemas: { params: IdParamsSchema, body: AdminSetUserRolesRequestSchema },
  handler: async ({ serviceContext, userId, params, body, req }) => {
    const [users, rbac] = await Promise.all([
      createUserRepository(),
      createRbacRepository(),
    ])

    const service = createAdminUserRoleService({
      users,
      rbac,
    }, serviceContext!)

    const result = await service.setUserRoles({ userId: params.id, roleIds: body!.roleIds, actorUserId: userId! })
    return createJsonApiResponse(req, ok(result))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
