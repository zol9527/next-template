import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { IdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { UpdateRoleRequestSchema } from '@/contracts/dtos/admin/rbac/roles.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createRbacRepository } from '@/repositories/factory'
import { createAdminRbacService } from '@/services/core/admin-rbac.service'

export const GET = withV1Route({
  action: 'admin:rbac:read',
  requireAccess: { action: 'read' as Action, scope: 'rbac' as Scope },
  schemas: { params: IdParamsSchema },
  handler: async ({ serviceContext, params, req }) => {
    const rbac = await createRbacRepository()
    const service = createAdminRbacService({ rbac }, serviceContext!)
    const role = await service.getRoleDetail(params.id)

    return createJsonApiResponse(req, ok({ role }))
  },
})

export const PUT = withV1Route({
  action: 'admin:rbac:write',
  requireAccess: { action: 'write' as Action, scope: 'rbac' as Scope },
  schemas: { params: IdParamsSchema, body: UpdateRoleRequestSchema },
  handler: async ({ serviceContext, params, body, req, userId }) => {
    const rbac = await createRbacRepository()
    const service = createAdminRbacService({ rbac }, serviceContext!)
    const role = await service.updateRole({
      roleId: params.id,
      name: body!.name,
      description: body!.description,
      actorId: userId!,
    })

    return createJsonApiResponse(req, ok({ role }))
  },
})

export const DELETE = withV1Route({
  action: 'admin:rbac:write',
  requireAccess: { action: 'write' as Action, scope: 'rbac' as Scope },
  schemas: { params: IdParamsSchema },
  handler: async ({ serviceContext, params, req, userId }) => {
    const rbac = await createRbacRepository()
    const service = createAdminRbacService({ rbac }, serviceContext!)
    await service.deleteRole({ roleId: params.id, actorId: userId! })

    return createJsonApiResponse(req, ok({ success: true }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
