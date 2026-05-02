import type { Action, Scope } from '@/config/access'
/**
 * 备份预估 API 路由
 *
 * @module api/v1/admin/data-management/backups/estimate
 * @description 在创建备份前预估备份大小、耗时等信息
 *
 * =============================================================================
 *
 * 端点说明:
 * - POST /api/v1/admin/data-management/backups/estimate - 预估备份参数
 *
 * 权限要求:
 * - 需要 admin 角色
 * - 需要 admin:backup:estimate 权限
 *
 * =============================================================================
 */

import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { EstimateRequestSchema } from '@/contracts/dtos/backup.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { getBackupJobRepository } from '@/repositories/factory'
import { createBackupService } from '@/services/core/backup.service'

/**
 * POST /api/v1/admin/data-management/backups/estimate
 *
 * 预估备份参数（大小、耗时等）
 *
 * @action admin:backup:estimate
 *
 * Request Body:
 * {
 *   "jobType": "full" | "incremental"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "estimatedSize": 104857600,
 *     "estimatedDuration": 120,
 *     "tableCount": 25,
 *     "totalRows": 1000000,
 *     ...
 *   }
 * }
 */
export const POST = withV1Route({
  action: 'admin:backup:estimate',
  requireAccess: { action: 'read' as Action, scope: 'backup' as Scope },
  schemas: { body: EstimateRequestSchema },
  handler: async ({ req, serviceContext, body }) => {
    serviceContext.logger.info(
      { action: 'backup:estimate', jobType: body!.jobType },
      '预估备份参数',
    )

    const backupJobs = await getBackupJobRepository()
    const service = createBackupService({ backupJobs }, serviceContext)
    const estimate = await service.estimateBackupParams({
      jobType: body!.jobType,
    })

    return createJsonApiResponse(req, ok(estimate))
  },
})

/**
 * OPTIONS 处理器（CORS 预检请求）
 */
export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
