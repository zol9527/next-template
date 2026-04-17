import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createPromoterRepository } from '@/repositories/factory'
import { createPromoterLevelService } from '@/plugins/promotion/services/promoter-level.service'

/**
Function: GET

Description: 获取所有推广员等级列表

Parameters:
	req(object): Next.js 请求对象

Returns:
	response(object): JSON 响应，包含推广员等级列表
*/
export const GET = withV1Route({
  pluginGuard: 'promotion',
  action: 'admin:promoter-levels:read',
  requireAccess: { action: 'read' as Action, scope: 'promoter-levels' as Scope },
  schemas: {},
  handler: async ({ req, serviceContext }) => {
    const service = createPromoterLevelService({
      promoters: await createPromoterRepository(),
    }, serviceContext!)
    const levels = await service.listLevels()

    return createJsonApiResponse(req, ok({ levels }))
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
