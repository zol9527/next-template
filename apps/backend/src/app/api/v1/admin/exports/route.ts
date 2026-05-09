import type { Action, Scope } from '@/config/access'
/**
 * Data Export API Routes
 *
 * @module api/v1/admin/exports
 * @description 数据导出 API 接口
 *
 * =============================================================================
 *
 * 端点说明:
 * - POST /api/v1/admin/exports - 创建导出任务
 * - GET /api/v1/admin/exports - 列出导出任务
 *
 * 权限要求:
 * - 需要 admin 角色
 * - 需要 admin:export:create 或 admin:export:read 权限
 *
 * =============================================================================
 */

import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { CreateExportJobRequestSchema, ListExportJobsQuerySchema } from '@/contracts/dtos/export.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { getExportJobRepository } from '@/repositories/factory'
import { createDataExportService } from '@/services/core/data-export.service'

/**
 * POST /api/v1/admin/exports
 *
 * 创建导出任务
 *
 * @action admin:export:create
 *
 * Request Body:
 * {
 *   "jobType": "buyers_payment" | "promoters_commission" | "orders_reconciliation" | "refunds",
 *   "filters": {
 *     "startTime": "2024-01-01T00:00:00Z",
 *     "endTime": "2024-12-31T23:59:59Z",
 *     "status": "success",
 *     "productId": "product-id"
 *   }
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "job-id",
 *     "jobType": "buyers_payment",
 *     "status": "pending",
 *     ...
 *   }
 * }
 */
export const POST = withV1Route({
  action: 'admin:export:create',
  requireAccess: { action: 'write' as Action, scope: 'exports' as Scope },
  schemas: { body: CreateExportJobRequestSchema },
  handler: async ({ req, serviceContext, body, userId }) => {

    serviceContext.logger.info(
      {
        action: 'export:create',
        userId: userId,
        jobType: body!.jobType,
        filters: body!.filters,
      },
      'Creating export job'
    )

    const exportJobs = await getExportJobRepository()
    const service = createDataExportService({ exportJobs }, serviceContext)

    const job = await service.createExportJob({
      jobType: body!.jobType,
      requestedBy: userId,
      filters: body!.filters ?? {},
    })

    return createJsonApiResponse(req, ok(job))
  },
})

/**
 * GET /api/v1/admin/exports
 *
 * 列出导出任务
 *
 * @action admin:export:read
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
  action: 'admin:export:read',
  requireAccess: { action: 'read' as Action, scope: 'exports' as Scope },
  schemas: { query: ListExportJobsQuerySchema },
  handler: async ({ req, serviceContext, query }) => {
    serviceContext.logger.info({ action: 'export:list', query }, 'Listing export jobs')

    const exportJobs = await getExportJobRepository()
    const service = createDataExportService({ exportJobs }, serviceContext)

    const result = await service.listExportJobs({
      jobType: query.jobType,
      status: query.status,
      limit: query.limit,
      cursor: query.cursor ?? null,
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
