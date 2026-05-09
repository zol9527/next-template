import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createRbacRepository } from '@/repositories/factory'
import { createAdminRbacService } from '@/services/core/admin-rbac.service'
import { CreateRoleSchema } from '@/contracts/dtos/admin/rbac/roles.dto'

export const GET = withV1Route({
  action: 'admin:rbac:read',
  requireAccess: { action: 'read' as Action, scope: 'rbac' as Scope },
  handler: async ({ serviceContext, req }) => {
    const rbac = await createRbacRepository()
    const service = createAdminRbacService({ rbac }, serviceContext!)
    const roles = await service.listRoles()

    return createJsonApiResponse(req, ok({ roles }))
  },
})

export const POST = withV1Route({
  action: 'admin:rbac:write',
  requireAccess: { action: 'write' as Action, scope: 'rbac' as Scope },
  schemas: { body: CreateRoleSchema },
  handler: async ({ serviceContext, body, req, userId }) => {
    const validatedBody = body!

    const { name, description } = validatedBody

    const rbac = await createRbacRepository()
    const service = createAdminRbacService({ rbac }, serviceContext!)
    const role = await service.createRole({ name, description, actorId: userId! })

    return createJsonApiResponse(req, ok(role))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
