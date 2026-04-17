import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok, fail } from '@/contracts/api-response.schema'
import { IdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { UpdatePromoterLevelConfigRequestSchema } from '@/plugins/promotion/contracts/admin-promoters.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createPromoterRepository } from '@/repositories/factory'
import { createPromoterLevelService } from '@/plugins/promotion/services/promoter-level.service'

/**
Function: PUT

Description: 更新推广员等级配置（佣金比例、最低销售额等）

Parameters:
	req(object): Next.js 请求对象
	params(object): 路径参数 { id: 等级 ID }
	body(object): 请求体 { commissionRate, minSalesAmount, minSalesCount, reason }

Returns:
	response(object): JSON 响应，包含更新后的等级信息
*/
export const PUT = withV1Route({
  pluginGuard: 'promotion',
  action: 'admin:promoter-levels:write',
  requireAccess: { action: 'write' as Action, scope: 'promoter-levels' as Scope },
  schemas: {
    params: IdParamsSchema,
    body: UpdatePromoterLevelConfigRequestSchema,
  },
  handler: async ({ req, params, body, serviceContext }) => {

    const service = createPromoterLevelService({
      promoters: await createPromoterRepository(),
    }, serviceContext!)

    // 检查等级是否存在
    const existing = await service.getLevelById(params.id)
    if (!existing) {
      return createJsonApiResponse(req, fail('NOT_FOUND', '等级不存在'))
    }

    // 更新等级配置
    const updated = await service.updateLevel({
      levelId: params.id,
      commissionRate: body!.commissionRate,
      minSalesAmount: body!.minSalesAmount,
      minSalesCount: body!.minSalesCount ?? 0,
      description: body!.reason,
    })

    return createJsonApiResponse(req, ok(updated))
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
