import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createUserRepository, createAdminRepository } from '@/repositories/factory'
import { createAdminMeMfaService } from '@/services/core/admin-me-mfa.service'

/**
 * POST /api/v1/admin/me/mfa/setup/totp
 *
 * Description: 生成 TOTP 密钥和二维码
 */
export const POST = withV1Route({
  action: 'admin:me:mfa:setup_totp',
  requireAccess: { action: 'execute' as Action, scope: 'account.mfa' as Scope },
  handler: async ({ req, auth, serviceContext }) => {
    const userRepo = await createUserRepository()
    const adminRepo = await createAdminRepository()
    const service = createAdminMeMfaService({ users: userRepo, admin: adminRepo }, serviceContext!)

    const result = await service.generateTotpSecret(auth!.userId)
    return createJsonApiResponse(req, ok(result))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
