import type { Action, Scope } from '@/config/access'
/**
 * Export Job Detail API Routes
 *
 * @module api/v1/admin/exports/[id]
 * @description 导出任务详情 API 接口
 *
 * =============================================================================
 *
 * 端点说明:
 * - GET /api/v1/admin/exports/:id - 获取导出任务详情
 *
 * 权限要求:
 * - 需要 admin 角色
 * - 需要 admin:export:read 权限
 *
 * =============================================================================
 */

import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { getExportJobRepository } from '@/repositories/factory'
import { createDataExportService } from '@/services/core/data-export.service'
import { ExportJobIdParamsSchema } from '@/contracts/dtos/export.dto'

/**
 * GET /api/v1/admin/exports/:id
 *
 * 获取导出任务详情
 *
 * @action admin:export:read
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "job-id",
 *     "jobType": "buyers_payment",
 *     "status": "completed",
 *     "fileUrl": "https://...",
 *     "fileName": "购买者支付记录_2024-01-03_123456.csv",
 *     "fileSize": 12345,
 *     "recordCount": 100,
 *     ...
 *   }
 * }
 */
export const GET = withV1Route({
  action: 'admin:export:read',
  requireAccess: { action: 'read' as Action, scope: 'exports' as Scope },
  schemas: { params: ExportJobIdParamsSchema },
  handler: async ({ req, serviceContext, params }) => {
    serviceContext.logger.info({ action: 'export:get_detail', jobId: params.id }, 'Getting export job detail')

    const exportJobs = await getExportJobRepository()
    const service = createDataExportService({ exportJobs }, serviceContext)

    const job = await service.getExportJob(params.id)

    if (!job) {
      return createJsonApiResponse(
        req,
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Export job not found',
          },
        },
        { status: 404 }
      )
    }

    return createJsonApiResponse(req, ok(job))
  },
})

/**
 * OPTIONS 处理器（CORS 预检请求）
 */
export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
