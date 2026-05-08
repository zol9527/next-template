import type { Action, Scope } from '@/config/access'
/**
 * 数据恢复 API 路由
 *
 * @module api/v1/admin/data-management/restore
 * @description 从备份文件恢复数据
 *
 * =============================================================================
 *
 * 端点说明:
 * - POST /api/v1/admin/data-management/restore - 创建恢复任务
 *
 * 权限要求:
 * - 需要 admin 角色
 * - 需要 admin:backup:restore 权限
 *
 * =============================================================================
 */

import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { CreateRestoreRequestSchema } from '@/contracts/dtos/backup.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { getBackupJobRepository } from '@/repositories/factory'
import { createBackupService } from '@/services/core/backup.service'

/**
 * POST /api/v1/admin/data-management/restore
 *
 * 创建恢复任务
 *
 * @action admin:backup:restore
 *
 * Request Body:
 * {
 *   "jobType": "full" | "incremental",
 *   "backupFileKey": "backups/2024/01/backup-full.sql.gz"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "job-id",
 *     "jobType": "full",
 *     "status": "pending",
 *     "backupFileKey": "backups/2024/01/backup-full.sql.gz",
 *     ...
 *   }
 * }
 */
export const POST = withV1Route({
  action: 'admin:backup:restore',
  requireAccess: { action: 'write' as Action, scope: 'backup' as Scope },
  schemas: { body: CreateRestoreRequestSchema },
  handler: async ({ req, serviceContext, body, userId }) => {
    serviceContext.logger.info(
      {
        action: 'backup:restore',
        userId,
        jobType: body!.jobType,
        backupFileKey: body!.backupFileKey,
      },
      '创建恢复任务',
    )

    const backupJobs = await getBackupJobRepository()
    const service = createBackupService({ backupJobs }, serviceContext)
    const job = await service.createRestore({
      jobType: body!.jobType,
      backupFileKey: body!.backupFileKey,
      requestedBy: userId,
    })

    return createJsonApiResponse(req, ok(job), { status: 201 })
  },
})

/**
 * OPTIONS 处理器（CORS 预检请求）
 */
export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
