import type { Action, Scope } from '@/config/access'
/**
 * 备份任务实时统计 API 路由
 *
 * @module api/v1/admin/data-management/backups/[id]/stats
 * @description 获取备份任务的实时进度和统计数据
 *
 * =============================================================================
 *
 * 端点说明:
 * - GET /api/v1/admin/data-management/backups/:id/stats - 获取备份任务实时统计
 *
 * 权限要求:
 * - 需要 admin 角色
 * - 需要 admin:backup:read 权限
 *
 * =============================================================================
 */

import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { BackupJobIdParamsSchema } from '@/contracts/dtos/backup.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { getBackupJobRepository } from '@/repositories/factory'
import { createBackupService } from '@/services/core/backup.service'

/**
 * GET /api/v1/admin/data-management/backups/:id/stats
 *
 * 获取备份任务实时统计
 *
 * @action admin:backup:read
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "jobId": "job-id",
 *     "totalTables": 10,
 *     "processedTables": 5,
 *     "totalRows": 10000,
 *     "processedRows": 5000,
 *     "percentage": 50,
 *     ...
 *   }
 * }
 */
export const GET = withV1Route({
  action: 'admin:backup:read',
  requireAccess: { action: 'read' as Action, scope: 'backup' as Scope },
  schemas: { params: BackupJobIdParamsSchema },
  handler: async ({ req, serviceContext, params }) => {
    serviceContext.logger.info(
      { action: 'backup:stats', jobId: params!.id },
      '获取备份任务实时统计',
    )

    const backupJobs = await getBackupJobRepository()
    const service = createBackupService({ backupJobs }, serviceContext)
    const stats = await service.getStats(params!.id)

    if (!stats) {
      return createJsonApiResponse(
        req,
        { success: false, error: { code: 'NOT_FOUND', message: '任务不存在' } },
        { status: 404 },
      )
    }

    return createJsonApiResponse(req, ok(stats))
  },
})

/**
 * OPTIONS 处理器（CORS 预检请求）
 */
export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
