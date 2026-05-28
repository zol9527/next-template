import type { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

import { env } from '@/config'
import { ok, fail } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSessionRepository, createUserRepository } from '@/repositories/factory'

const ResetPasswordRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8).optional(),
})

export const POST = withV1Route({
  action: 'internal:test:reset_password',
  schemas: { body: ResetPasswordRequestSchema },
  handler: async ({ req, body, serviceContext }) => {
    // 安全：该端点仅用于 E2E/本地测试，默认隐藏
    // 额外检查：生产环境下必须禁用
    if (process.env.E2E_ALLOW_INTERNAL_TEST_ROUTES !== 'true' || process.env.NODE_ENV === 'production') {
      return createJsonApiResponse(req, fail('NOT_FOUND', 'Not found'), { status: 404 })
    }

    // 安全修复: 添加内部 cron token 验证，与 internal/cron 路由保持一致
    const configuredToken = env.INTERNAL_CRON_TOKEN
    const providedToken = req.headers.get('x-internal-cron-token')
    if (!configuredToken || !providedToken || providedToken !== configuredToken) {
      return createJsonApiResponse(req, fail('UNAUTHORIZED', 'Unauthorized'), { status: 401 })
    }

    const identifier = body!.username
    const newPassword = body!.password || 'Test@123456'

    const [users, sessions] = await Promise.all([
      createUserRepository(),
      createSessionRepository(),
    ])

    const user = await users.getUserByIdentifier(serviceContext!, { identifier })
    if (!user) {
      return createJsonApiResponse(req, fail('NOT_FOUND', 'User not found'), { status: 404 })
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await Promise.all([
      users.updatePassword(serviceContext!, { userId: user.id, passwordHash }),
      sessions.revokeAllSessionsForUser(serviceContext!, { userId: user.id }),
      users.resetLoginFailures(serviceContext!, { userId: user.id }),
    ])

    return createJsonApiResponse(req, ok({ userId: user.id }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
