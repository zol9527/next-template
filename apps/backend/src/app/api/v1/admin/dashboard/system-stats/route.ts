import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSystemStatsService } from '@/services/core/system-stats.service'
import { SystemStatsSchema } from '@/contracts/dtos/admin/system-stats.dto'

/**
 * Function: GET
 *
 * Description: 获取系统资源监控数据，包括 CPU、内存、磁盘、运行时间、
 * 进程、网络和数据库等指标。此接口为核心功能，不受插件状态影响，
 * 需要用户拥有 dashboard 的 read 权限。
 */
export const GET = withV1Route({
  action: 'admin:dashboard:system-stats',
  requireAccess: { action: 'read' as Action, scope: 'dashboard' as Scope },
  schemas: {},
  // NOTE: 无 pluginGuard — 这是核心功能，始终可用
  handler: async ({ req, serviceContext }) => {
    const service = createSystemStatsService({}, serviceContext!)
    const data = await service.collect()

    const parsed = SystemStatsSchema.safeParse(data)
    if (!parsed.success) {
      serviceContext!.logger.error({
        action: 'system_stats.validation_error',
        error: parsed.error,
      })
    }

    return createJsonApiResponse(req, ok(data))
  },
})

/**
 * Function: OPTIONS
 *
 * Description: 处理 CORS 预检请求
 *
 * Parameters:
 *     req(NextRequest): Next.js 请求对象
 *
 * Returns:
 *     response(NextResponse): CORS 预检响应
 */
export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
