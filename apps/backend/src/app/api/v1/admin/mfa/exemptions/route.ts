import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { AddMfaExemptionRequestSchema } from '@/contracts/dtos/admin/mfa-settings.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMfaPolicyRepository } from '@/repositories/factory/core/mfa-policy.factory'
import { createMfaPolicyService } from '@/services/core/mfa-policy.service'

/**
 * Function: POST
 *
 * Description: 添加 MFA 豁免用户
 *
 * Parameters:
 *   req(NextRequest): HTTP 请求对象
 *
 * Request Body:
 *   userId(string): 用户 ID（UUID）
 *   reason(string): 豁免原因
 *   expiresAt(string, optional): 过期时间（ISO 8601 格式）
 *
 * Returns:
 *   Promise<NextResponse>: JSON 响应，包含创建的豁免记录
 *
 * Permissions:
 *   - 需要 'mfa.write' 权限
 *
 * Error Responses:
 *   - 400: 请求参数校验失败
 *   - 400: 用户已存在有效的 MFA 豁免
 *   - 403: 权限不足
 *   - 401: 未登录
 */
export const POST = withV1Route({
  action: 'admin:mfa:add_exemption',
  requireAccess: { action: 'write' as Action, scope: 'mfa' as Scope },
  schemas: { body: AddMfaExemptionRequestSchema },
  handler: async ({ serviceContext, userId, body, req }) => {
    const validatedBody = body!

    // 创建 Repository 实例
    const mfaRepo = createMfaPolicyRepository()

    // 创建 Service 实例
    const service = createMfaPolicyService({ mfaRepo }, serviceContext!)

    // 添加豁免（userId 是当前操作的管理员 ID）
    const exemption = await service.addExemption(validatedBody, userId!)

    return createJsonApiResponse(req, ok(exemption))
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
