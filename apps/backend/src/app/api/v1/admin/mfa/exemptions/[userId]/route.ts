import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { UserIdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMfaPolicyRepository } from '@/repositories/factory/core/mfa-policy.factory'
import { createMfaPolicyService } from '@/services/core/mfa-policy.service'

/**
 * Function: DELETE
 *
 * Description: 移除用户的 MFA 豁免
 *
 * Parameters:
 *   req(NextRequest): HTTP 请求对象
 *   params.userId(string): 要移除豁免的用户 ID（UUID）
 *
 * Returns:
 *   Promise<NextResponse>: JSON 响应，包含删除结果
 *
 * Permissions:
 *   - 需要 'mfa.write' 权限
 *
 * Error Responses:
 *   - 400: 路径参数校验失败
 *   - 403: 权限不足
 *   - 401: 未登录
 */
export const DELETE = withV1Route({
  action: 'admin:mfa:remove_exemption',
  requireAccess: { action: 'write' as Action, scope: 'mfa' as Scope },
  schemas: { params: UserIdParamsSchema },
  handler: async ({ serviceContext, userId, params, req }) => {
    const validatedParams = params!

    // 创建 Repository 实例
    const mfaRepo = createMfaPolicyRepository()

    // 创建 Service 实例
    const service = createMfaPolicyService({ mfaRepo }, serviceContext!)

    // 移除豁免（userId 是当前操作的管理员 ID）
    const success = await service.removeExemption(validatedParams.userId, userId!)

    return createJsonApiResponse(req, ok({ success }))
  },
})

/**
 * Function: OPTIONS
 *
 * Description: 处理 OPTIONS 预检请求，返回 CORS 响应头
 *
 * Parameters:
 *   req(NextRequest): HTTP 请求对象
 *
 * Returns:
 *   NextResponse: 带有 CORS 头的响应
 */
export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
