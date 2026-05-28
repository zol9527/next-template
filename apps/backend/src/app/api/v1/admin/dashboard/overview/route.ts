import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createDashboardOverviewService } from '@/services/core/dashboard-overview.service'

/**
 * GET /api/v1/admin/dashboard/overview
 *
 * 获取 Dashboard 全量聚合数据（KPI + 活动 + 趋势 + 分布）
 * 无 pluginGuard — 核心功能始终可用
 */
export const GET = withV1Route({
  action: 'admin:dashboard:overview',
  requireAccess: { action: 'read' as Action, scope: 'dashboard' as Scope },
  schemas: {},
  handler: async ({ req, serviceContext }) => {
    const service = createDashboardOverviewService({}, serviceContext!)
    const data = await service.getOverview()
    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
