import type { Action, Scope } from '@/config/access'
/**
 * 数据备份 API 路由
 *
 * @module api/v1/admin/data-management/backups
 * @description 数据备份管理 API 接口
 *
 * =============================================================================
 *
 * 端点说明:
 * - POST /api/v1/admin/data-management/backups - 创建备份任务
 * - GET  /api/v1/admin/data-management/backups - 列出备份任务
 *
 * 权限要求:
 * - 需要 admin 角色
 * - 需要 admin:backup:create 或 admin:backup:read 权限
 *
 * =============================================================================
 */

import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { CreateBackupRequestSchema, ListBackupJobsQuerySchema } from '@/contracts/dtos/backup.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { getBackupJobRepository } from '@/repositories/factory'
import { createBackupService } from '@/services/core/backup.service'

/**
 * POST /api/v1/admin/data-management/backups
 *
 * 创建备份任务
 *
 * @action admin:backup:create
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
 *     "id": "job-id",
 *     "jobType": "full",
 *     "status": "pending",
 *     ...
 *   }
 * }
 */
export const POST = withV1Route({
  action: 'admin:backup:create',
  requireAccess: { action: 'write' as Action, scope: 'backup' as Scope },
  schemas: { body: CreateBackupRequestSchema },
  handler: async ({ req, serviceContext, body, userId }) => {
    serviceContext.logger.info(
      {
        action: 'backup:create',
        userId,
        jobType: body!.jobType,
      },
      '创建备份任务',
    )

    const backupJobs = await getBackupJobRepository()
    const service = createBackupService({ backupJobs }, serviceContext)
    const job = await service.createBackup({
      jobType: body!.jobType,
      requestedBy: userId,
    })

    return createJsonApiResponse(req, ok(job), { status: 201 })
  },
})

/**
 * GET /api/v1/admin/data-management/backups
 *
 * 列出备份任务
 *
 * @action admin:backup:read
 *
 * Query Parameters:
 * - jobType: string (optional) - 筛选任务类型
 * - status: string (optional) - 筛选任务状态
 * - limit: number (default: 20) - 每页数量
 * - cursor: string (optional) - 分页游标
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "items": [...],
 *     "nextCursor": "cursor-or-null"
 *   }
 * }
 */
export const GET = withV1Route({
  action: 'admin:backup:read',
  requireAccess: { action: 'read' as Action, scope: 'backup' as Scope },
  schemas: { query: ListBackupJobsQuerySchema },
  handler: async ({ req, serviceContext, query }) => {
    serviceContext.logger.info({ action: 'backup:list', query }, '列出备份任务')

    const backupJobs = await getBackupJobRepository()
    const service = createBackupService({ backupJobs }, serviceContext)
    const result = await service.listJobs({
      status: query?.status,
      jobType: query?.jobType,
      cursor: query?.cursor,
      limit: query?.limit,
    })

    return createJsonApiResponse(req, ok(result))
  },
})

/**
 * OPTIONS 处理器（CORS 预检请求）
 */
export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
