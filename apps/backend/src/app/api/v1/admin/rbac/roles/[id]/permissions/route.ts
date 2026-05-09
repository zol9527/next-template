import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import {
  AdminRbacUpdateRoleGrantsRequestSchema,
} from '@/contracts/dtos/admin/rbac/role-grants.dto'
import { IdParamsSchema } from '@/contracts/dtos/route-params.dto'
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
    const grants = await service.getRoleGrants(params.id)

    return createJsonApiResponse(req, ok({ roleId: params.id, grants }))
  },
})

export const PUT = withV1Route({
  action: 'admin:rbac:write',
  requireAccess: { action: 'write' as Action, scope: 'rbac' as Scope },
  schemas: { params: IdParamsSchema, body: AdminRbacUpdateRoleGrantsRequestSchema },
  handler: async ({ serviceContext, params, body, req, userId }) => {
    const rbac = await createRbacRepository()
    const service = createAdminRbacService({ rbac }, serviceContext!)
    const grants = await service.updateRoleGrants({
      roleId: params.id,
      grants: body!.grants,
      actorId: userId!,
    })

    return createJsonApiResponse(req, ok({ roleId: params.id, grants }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
