import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMfaPolicyRepository } from '@/repositories/factory/core/mfa-policy.factory'
import { createRbacRepository } from '@/repositories/factory'
import { createMfaPolicyService } from '@/services/core/mfa-policy.service'

/**
 * Function: GET
 *
 * Description: 获取 MFA 设置（全局设置、角色策略、豁免列表、可用角色）
 *
 * Parameters:
 *   req(NextRequest): HTTP 请求对象
 *
 * Returns:
 *   Promise<NextResponse>: JSON 响应，包含 MFA 设置信息
 *
 * Permissions:
 *   - 需要 'mfa.read' 权限
 */
export const GET = withV1Route({
  action: 'admin:mfa:get_settings',
  requireAccess: { action: 'read' as Action, scope: 'mfa' as Scope },
  handler: async ({ serviceContext, req }) => {
    // 创建 Repository 实例
    const mfaRepo = createMfaPolicyRepository()
    const rbacRepo = await createRbacRepository()

    // 创建 Service 实例
    const service = createMfaPolicyService({ mfaRepo }, serviceContext!)

    // 获取所有可用角色
    const allRoles = await rbacRepo.listRoles(serviceContext!)
    const availableRoles = allRoles.map((role) => ({
      name: role.name,
      description: role.description,
    }))

    // 获取完整的 MFA 设置
    const settings = await service.getSettings(availableRoles)

    return createJsonApiResponse(req, ok(settings))
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
