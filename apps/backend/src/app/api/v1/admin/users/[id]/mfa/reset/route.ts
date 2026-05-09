import type { Action, Scope } from '@/config/access'
/**
 * File: src/app/api/v1/admin/users/[userId]/mfa/reset/route.ts
 * Description: 管理员 MFA 重置 API - 强制重置用户的 MFA
 */

import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { IdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { AdminMfaResetRequestSchema, AdminMfaResetResponseSchema } from '@/contracts/dtos/mfa/admin-mfa-reset.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMfaRepository } from '@/repositories/factory'
import { MfaAuditLogService } from '@/services/core/mfa-audit-log.service'
import { NotFoundError } from '@/lib/errors/app-error'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import type { z } from 'zod'

export const POST = withV1Route({
  action: 'admin:mfa_reset',
  requireAccess: { action: 'write' as Action, scope: 'users' as Scope },
  schemas: {
    params: IdParamsSchema,
    body: AdminMfaResetRequestSchema,
  },
  handler: async ({ req, params, body, userId, serviceContext }) => {
    const mfaRepo = await createMfaRepository()
    const clientIp = extractClientIpSafe(req, { requireIp: false }).ip ?? '0.0.0.0'
    const userAgent = req.headers.get('user-agent')

    // 检查目标用户是否存在
    const targetUserMfaData = await mfaRepo.getUserMfaData(serviceContext, { userId: params.id })
    if (!targetUserMfaData) {
      throw new NotFoundError('用户不存在')
    }

    try {
      // 重置 MFA
      await mfaRepo.disableUserMfa(serviceContext, { userId: params.id })

      // 记录成功审计日志（管理员操作）
      const logEntry = MfaAuditLogService.logSuccess(
        params.id,
        'reset-by-admin',
        clientIp,
        userAgent ?? undefined,
        {
          adminUserId: userId,
          reason: body?.reason,
        }
      )
      await mfaRepo.createAuditLog(serviceContext, MfaAuditLogService.formatForStorage(logEntry))

      serviceContext.logger.info(
        { action: 'admin_mfa_reset', targetUserId: params.id, adminUserId: userId },
        'Admin reset user MFA'
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // 记录失败审计日志（管理员操作）
      const failureLogEntry = MfaAuditLogService.logFailure(
        params.id,
        'reset-by-admin',
        clientIp,
        errorMessage,
        userAgent ?? undefined,
        {
          adminUserId: userId,
          reason: body?.reason,
        }
      )
      await
 mfaRepo.createAuditLog(serviceContext, MfaAuditLogService.formatForStorage(failureLogEntry))

      serviceContext.logger.error(
        { action: 'admin_mfa_reset', targetUserId: params.id, adminUserId: userId, errorMessage },
        'Admin reset user MFA failed'
      )

      throw error
    }

    const response: z.infer<typeof AdminMfaResetResponseSchema> = {
      userId: params.id,
      reset: true,
    }

    return createJsonApiResponse(req, ok(response))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
