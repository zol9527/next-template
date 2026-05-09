import type { Action, Scope } from '@/config/access'
/**
 * 备份任务详情 API 路由
 *
 * @module api/v1/admin/data-management/backups/[id]
 * @description 单个备份任务的查询与删除
 *
 * =============================================================================
 *
 * 端点说明:
 * - GET    /api/v1/admin/data-management/backups/:id - 获取备份任务详情
 * - DELETE /api/v1/admin/data-management/backups/:id - 删除备份任务
 *
 * 权限要求:
 * - 需要 admin 角色
 * - 需要 admin:backup:read 或 admin:backup:delete 权限
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
 * GET /api/v1/admin/data-management/backups/:id
 *
 * 获取备份任务详情
 *
 * @action admin:backup:read
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "job-id",
 *     "jobType": "full",
 *     "status": "completed",
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
      { action: 'backup:detail', jobId: params!.id },
      '获取备份任务详情',
    )

    const backupJobs = await getBackupJobRepository()
    const service = createBackupService({ backupJobs }, serviceContext)
    const job = await service.getJob(params!.id)

    if (!job) {
      return createJsonApiResponse(
        req,
        { success: false, error: { code: 'NOT_FOUND', message: '任务不存在' } },
        { status: 404 },
      )
    }

    return createJsonApiResponse(req, ok(job))
  },
})

/**
 * DELETE /api/v1/admin/data-management/backups/:id
 *
 * 删除备份任务
 *
 * @action admin:backup:delete
 *
 * Response:
 * {
 *   "success": true,
 *   "data": { "deleted": true }
 * }
 */
export const DELETE = withV1Route({
  action: 'admin:backup:delete',
  requireAccess: { action: 'write' as Action, scope: 'backup' as Scope },
  schemas: { params: BackupJobIdParamsSchema },
  handler: async ({ req, serviceContext, params }) => {
    serviceContext.logger.info(
      { action: 'backup:delete', jobId: params!.id },
      '删除备份任务',
    )

    const backupJobs = await getBackupJobRepository()
    const service = createBackupService({ backupJobs }, serviceContext)
    await service.deleteJob(params!.id)

    return createJsonApiResponse(req, ok({ deleted: true }), { status: 200 })
  },
})

/**
 * OPTIONS 处理器（CORS 预检请求）
 */
export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
