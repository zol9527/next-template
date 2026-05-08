import type { Action, Scope } from '@/config/access'
/**
 * 备份文件下载 API 路由
 *
 * @module api/v1/admin/data-management/backups/[id]/download
 * @description 获取备份文件的下载信息（预签名 URL 或文件流）
 *
 * =============================================================================
 *
 * 端点说明:
 * - GET /api/v1/admin/data-management/backups/:id/download - 获取备份下载信息
 *
 * 权限要求:
 * - 需要 admin 角色
 * - 需要 admin:backup:download 权限
 *
 * =============================================================================
 */

import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { BackupJobIdParamsSchema, BackupDownloadQuerySchema } from '@/contracts/dtos/backup.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { getBackupJobRepository } from '@/repositories/factory'
import { createBackupService } from '@/services/core/backup.service'

/**
 * GET /api/v1/admin/data-management/backups/:id/download
 *
 * 获取备份文件的下载信息
 *
 * @action admin:backup:download
 *
 * Query Parameters:
 * - format: string (optional) - 下载格式
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "url": "https://storage.example.com/backup-file.sql.gz",
 *     "fileName": "backup-2024-01-01.sql.gz",
 *     "fileSize": 10485760,
 *     "expiresAt": "2024-01-02T00:00:00Z"
 *   }
 * }
 */
export const GET = withV1Route({
  action: 'admin:backup:download',
  requireAccess: { action: 'read' as Action, scope: 'backup' as Scope },
  schemas: { params: BackupJobIdParamsSchema, query: BackupDownloadQuerySchema },
  handler: async ({ req, serviceContext, params, userId }) => {
    serviceContext.logger.info(
      { action: 'backup:download', jobId: params!.id, userId },
      '获取备份文件下载信息',
    )

    const backupJobs = await getBackupJobRepository()
    const service = createBackupService({ backupJobs }, serviceContext)
    const result = await service.resolveDownloadFile({
      jobId: params!.id,
      userId: userId!,
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
