import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { IdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { UpdatePromoterLevelRequestSchema } from '@/plugins/promotion/contracts/admin-promoters.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createPromoterRepository } from '@/repositories/factory'
import { createPromoterLevelService } from '@/plugins/promotion/services/promoter-level.service'

/**
Function: PUT

Description: 调整推广员等级

Parameters:
    req(object): Next.js 请求对象
    params(object): 路径参数 { id: 推广员用户 ID }
    body(object): 请求体 { levelId, reason }

Returns:
    response(object): JSON 响应，包含调整后的等级信息
*/
export const PUT = withV1Route({
  pluginGuard: 'promotion',
  action: 'admin:promoters:update',
  schemas: {
    params: IdParamsSchema,
    body: UpdatePromoterLevelRequestSchema,
  },
  requireAccess: { action: 'write' as Action, scope: 'promoters' as Scope },
  handler: async ({ req, params, body, serviceContext }) => {

    const promoters = await createPromoterRepository()
    const service = createPromoterLevelService({ promoters }, serviceContext!)

    const result = await service.setLevel({
      userId: params.id,
      levelId: body!.levelId,
      reason: body!.reason,
    })

    return createJsonApiResponse(req, ok(result))
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
