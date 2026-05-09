import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { MfaDisableSchema } from '@/contracts/dtos/admin/me'
import { createUserRepository, createAdminRepository } from '@/repositories/factory'
import { createAdminMeMfaService } from '@/services/core/admin-me-mfa.service'

/**
 * GET /api/v1/admin/me/mfa
 *
 * Description: 获取 MFA 状态
 */
export const GET = withV1Route({
  action: 'admin:me:mfa',
  requireAccess: { action: 'read' as Action, scope: 'account.mfa' as Scope },
  handler: async ({ req, auth, serviceContext }) => {
    const userRepo = await createUserRepository()
    const adminRepo = await createAdminRepository()
    const service = createAdminMeMfaService({ users: userRepo, admin: adminRepo }, serviceContext!)

    const status = await service.getMfaStatus(auth!.userId)
    return createJsonApiResponse(req, ok(status))
  },
})

/**
 * DELETE /api/v1/admin/me/mfa
 *
 * Description: 禁用 MFA
 */
export const DELETE = withV1Route({
  action: 'admin:me:mfa:disable',
  requireAccess: { action: 'execute' as Action, scope: 'account.mfa' as Scope },
  schemas: {
    body: MfaDisableSchema,
  },
  handler: async ({ req, auth, serviceContext, body }) => {
    const userRepo = await createUserRepository()
    const adminRepo = await createAdminRepository()
    const service = createAdminMeMfaService({ users: userRepo, admin: adminRepo }, serviceContext!)

    const result = await service.disableMfa(auth!.userId, body!)
    return createJsonApiResponse(req, ok(result))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
