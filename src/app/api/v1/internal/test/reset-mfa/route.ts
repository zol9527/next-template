import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, fail } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMfaRepository, createUserRepository } from '@/repositories/factory'

const ResetMfaRequestSchema = z.object({
  username: z.string().min(1),
})

export const POST = withV1Route({
  action: 'internal:test:reset_mfa',
  schemas: { body: ResetMfaRequestSchema },
  handler: async ({ req, body, serviceContext }) => {
    // 安全：该端点仅用于 E2E/本地测试，默认隐藏
    // 额外检查：生产环境下必须禁用
    if (process.env.E2E_ALLOW_INTERNAL_TEST_ROUTES !== 'true' || process.env.NODE_ENV === 'production') {
      return createJsonApiResponse(req, fail('NOT_FOUND', 'Not found'), { status: 404 })
    }

    const identifier = body!.username
    const [users, mfa] = await Promise.all([
      createUserRepository(),
      createMfaRepository(),
    ])

    const user = await users.getUserByIdentifier(serviceContext!, { identifier })
    if (!user) {
      return createJsonApiResponse(req, fail('NOT_FOUND', 'User not found'), { status: 404 })
    }

    await Promise.all([
      mfa.disableUserMfa(serviceContext!, { userId: user.id }),
      users.resetLoginFailures(serviceContext!, { userId: user.id }),
    ])

    return createJsonApiResponse(req, ok({ userId: user.id }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
