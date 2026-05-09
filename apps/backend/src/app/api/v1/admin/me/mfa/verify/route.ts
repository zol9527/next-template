import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { MfaVerifySchema } from '@/contracts/dtos/admin/me'
import { createUserRepository, createAdminRepository } from '@/repositories/factory'
import { createAdminMeMfaService } from '@/services/core/admin-me-mfa.service'

/**
 * POST /api/v1/admin/me/mfa/verify
 *
 * Description: 验证 TOTP 码并启用 MFA
 */
export const POST = withV1Route({
  action: 'admin:me:mfa:verify',
  requireAccess: { action: 'execute' as Action, scope: 'account.mfa' as Scope },
  schemas: {
    body: MfaVerifySchema,
  },
  handler: async ({ req, auth, serviceContext, body }) => {
    const userRepo = await createUserRepository()
    const adminRepo = await createAdminRepository()
    const service = createAdminMeMfaService({ users: userRepo, admin: adminRepo }, serviceContext!)

    const result = await service.verifyAndEnableTotp(auth!.userId, body!)
    return createJsonApiResponse(req, ok(result))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
