import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { AdminPromoterListQuerySchema } from '@/plugins/promotion/contracts/admin-promoters.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createPromoterRepository, createCommissionRepository, createDistributionRepository } from '@/repositories/factory'
import { createPromoterService } from '@/plugins/promotion/services/promoter.service'

/**
Function: GET

Description: 获取推广员列表（带统计信息），支持搜索、筛选和分页

Parameters:
    req(object): Next.js 请求对象
    query(object): 查询参数 { limit, cursor, level, keyword }

Returns:
    response(object): JSON 响应，包含推广员列表和分页信息
*/
export const GET = withV1Route({
  pluginGuard: 'promotion',
  action: 'admin:promoters:read',
  schemas: { query: AdminPromoterListQuerySchema },
  requireAccess: { action: 'read' as Action, scope: 'promoters' as Scope },
  handler: async ({ req, query, serviceContext, auth }) => {
    const [promoters, commissions, distributions] = await Promise.all([
      createPromoterRepository(),
      createCommissionRepository(),
      createDistributionRepository(),
    ])
    const service = createPromoterService({ promoters, commissions, distributions }, serviceContext!)

    const isAdmin = auth?.roles.includes('admin') ?? false
    const data = await service.listPromotersWithStats({
      limit: query.limit,
      cursor: query.cursor ?? null,
      level: query.level ?? null,
      keyword: query.keyword ?? null,
      promoterUserId: !isAdmin ? auth!.userId : undefined,
    })

    // 将 Repository 返回的 { items, nextCursor } 转换为前端期望的 { promoters, nextCursor }
    const response = {
      promoters: data.items,
      nextCursor: data.nextCursor,
    }
    return createJsonApiResponse(req, ok(response))
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
