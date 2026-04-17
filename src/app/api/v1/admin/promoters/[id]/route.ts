import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok, fail } from '@/contracts/api-response.schema'
import { IdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createDistributionRepository, createCommissionRepository, createPromoterRepository } from '@/repositories/factory'
import { createPromoterService, PromoterServiceError } from '@/plugins/promotion/services/promoter.service'

/**
Function: GET

Description: 获取单个推广员的详细信息

Parameters:
    req(object): Next.js 请求对象
    params(object): 路径参数 { id: 推广员用户 ID }

Returns:
    response(object): JSON 响应，包含推广员详细信息
*/
export const GET = withV1Route({
  pluginGuard: 'promotion',
  action: 'admin:promoters:read',
  schemas: { params: IdParamsSchema },
  requireAccess: { action: 'read' as Action, scope: 'promoters' as Scope },
  handler: async ({ req, params, serviceContext }) => {
    const [promoters, commissions, distributions] = await Promise.all([
      createPromoterRepository(),
      createCommissionRepository(),
      createDistributionRepository(),
    ])

    const service = createPromoterService({ promoters, commissions, distributions }, serviceContext!)

    try {
      const profile = await service.getProfile(params.id)
      return createJsonApiResponse(req, ok(profile))
    } catch (error) {
      if (error instanceof PromoterServiceError && error.code === 'NOT_FOUND') {
        return createJsonApiResponse(req, fail('NOT_FOUND', '推广员不存在'))
      }
      throw error
    }
  },
})

/**
Function: OPTIONS

Description: 处理 CORS 预检请求

Parameters:
    req(object): Next.js 请求对象

Returns:
    response(object): CORS 预检响应
*/
export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
