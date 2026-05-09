import type { Action, Scope } from '@/config/access'
/**
 * File: src/app/api/v1/admin/mfa/global/route.ts
 * Description: MFA 全局设置管理 API 路由
 */

import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { UpdateMfaGlobalSettingsRequestSchema } from '@/contracts/dtos/admin/mfa-settings.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMfaPolicyRepository } from '@/repositories/factory/core/mfa-policy.factory'
import { createMfaPolicyService } from '@/services/core/mfa-policy.service'

/**
 * PUT /api/v1/admin/mfa/global
 *
 * Description: 更新全局 MFA 设置
 *
 * Request Body:
 *   mode(MfaGlobalMode): MFA 全局模式 ('disabled' | 'optional' | 'required')
 *   allowExemptions(boolean): 是否允许管理员豁免
 *
 * Response:
 *   200: 更新成功，返回更新后的全局设置
 *   400: 请求参数无效
 *   401: 未授权
 *   403: 权限不足
 *   500: 服务器内部错误
 */
export const PUT = withV1Route({
  action: 'mfa:update_global',
  requireAccess: { action: 'write' as Action, scope: 'mfa' as Scope },
  schemas: { body: UpdateMfaGlobalSettingsRequestSchema },
  handler: async ({ req, serviceContext, body, userId }) => {
    const mfaRepo = createMfaPolicyRepository()
    const service = createMfaPolicyService({ mfaRepo }, serviceContext)
    const data = await service.updateGlobalSettings(body!, userId!)

    return createJsonApiResponse(req, ok(data))
  },
})

/**
 * OPTIONS /api/v1/admin/mfa/global
 *
 * Description: 处理 CORS 预检请求
 */
export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
