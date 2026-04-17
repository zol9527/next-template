import type { NextRequest } from 'next/server'
import type { z } from 'zod'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import {
  UpdateMfaRolePoliciesRequestSchema,
  MfaRolePolicyDtoSchema,
} from '@/contracts/dtos/admin/mfa-settings.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMfaPolicyRepository } from '@/repositories/factory/core/mfa-policy.factory'
import { createMfaPolicyService } from '@/services/core/mfa-policy.service'

/**
 * PUT /api/v1/admin/mfa/roles
 *
 * Description: 批量更新角色的 MFA 策略
 *
 * Features:
 * - 验证用户权限 (mfa.write)
 * - 批量更新多个角色的策略
 * - 记录审计日志
 *
 * Request Body:
 * - policies: 角色策略数组
 *   - roleName: 角色名称
 *   - policy: 策略类型 (inherit | force)
 *   - allowExemptions: 是否允许豁免
 *
 * Response:
 * - 200: 更新成功，返回更新后的角色策略列表
 */
export const PUT = withV1Route({
  action: 'mfa:update_roles',
  requireAccess: { action: 'write' as Action, scope: 'mfa' as Scope },
  schemas: {
    body: UpdateMfaRolePoliciesRequestSchema,
  },
  handler: async ({ req, body, userId, serviceContext, logger }) => {
    // 创建 MFA Policy Repository
    const mfaPolicyRepo = createMfaPolicyRepository()

    // 创建 MFA Policy Service
    const mfaPolicyService = createMfaPolicyService({ mfaRepo: mfaPolicyRepo }, serviceContext)

    const policies = body?.policies ?? []
    const adminUserId = userId ?? ''

    logger.info(
      {
        action: 'mfa_update_role_policies',
        adminUserId,
        roleCount: policies.length,
        roles: policies.map((p) => p.roleName),
      },
      'Admin updating MFA role policies'
    )

    // 批量更新角色策略（Service 层内部会记录审计日志）
    const updatedPolicies = await mfaPolicyService.updateRolePolicies(policies, adminUserId)

    logger.info(
      {
        action: 'mfa_update_role_policies_success',
        adminUserId: userId,
        updatedCount: updatedPolicies.length,
      },
      'MFA role policies updated successfully'
    )

    // 构造响应
    const response: z.infer<typeof MfaRolePolicyDtoSchema>[] = updatedPolicies

    return createJsonApiResponse(req, ok(response))
  },
})

/**
 * OPTIONS /api/v1/admin/mfa/roles
 *
 * Description: 处理 CORS 预检请求
 */
export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
