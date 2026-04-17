import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import {
  AdminMediaAssetCursorListQuerySchema,
  AdminMediaAssetListQuerySchema,
  AdminCreateMediaAssetRequestSchema,
} from '@/contracts/dtos/admin/media-assets.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { getStorageProvider } from '@/lib/storage/helper'
import { createMediaAssetRepository } from '@/repositories/factory'
import { createAdminMediaAssetService } from '@/services/core/admin-media-asset.service'

function getQueryObject(req: NextRequest): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {}

  req.nextUrl.searchParams.forEach((value, key) => {
    const existing = out[key]
    if (existing === undefined) {
      out[key] = value
      return
    }

    if (Array.isArray(existing)) {
      existing.push(value)
      return
    }

    out[key] = [existing, value]
  })

  return out
}

/**
 * GET /api/v1/admin/media-assets
 *
 * Description: 获取媒体资产列表
 *
 * Query Parameters (游标分页):
 *   cursor: string - 游标值（可选）
 *   pageSize: number - 每页数量（默认 12，最大 50）
 *   status: string - 状态筛选（可选）
 *   provider: string - 提供商筛选（可选）
 *   contentType: string - 内容类型筛选（可选）
 *   sortBy: string - 排序字段（可选，默认 createdAt）
 *   sortOrder: 'asc' | 'desc' - 排序方向（可选，默认 desc）
 *
 * Query Parameters (传统分页，保留向后兼容):
 *   page: number - 页码（从 1 开始）
 *   pageSize: number - 每页数量
 *   ... 其他筛选参数同上
 *
 * Response:
 *   200: 媒体资产列表
 *   401: 未授权
 *   403: 无权限
 */
export const GET = withV1Route({
  action: 'admin:media:read',
  requireAccess: { action: 'read' as Action, scope: 'media' as Scope },
  schemas: { query: AdminMediaAssetCursorListQuerySchema },
  handler: async ({ req, serviceContext, query }) => {
    const media = await createMediaAssetRepository()
    const service = createAdminMediaAssetService({
      media,
      storage: getStorageProvider(),
    }, serviceContext)

    // 默认使用游标分页；仅当显式传入 page 时走传统分页（向后兼容）
    const isPageMode = req.nextUrl.searchParams.has('page')

    if (!isPageMode) {
      // 游标分页模式（cursor 可不传，表示第一页）
      const data = await service.listMediaAssetsCursor({
        cursor: query.cursor ?? null,
        limit: query.pageSize,
        status: query.status,
        provider: query.provider,
        contentType: query.contentType,
        search: query.search,
        type: query.type,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      })

      return createJsonApiResponse(req, ok({
        items: data.items,
        nextCursor: data.nextCursor,
        totalRecords: data.total,
      }))
    } else {
      // 传统分页模式（向后兼容）
      const legacyQuery = AdminMediaAssetListQuerySchema.parse(getQueryObject(req))
      const page = legacyQuery.page
      const pageSize = legacyQuery.pageSize

      const data = await service.listMediaAssets({
        page,
        pageSize,
        status: legacyQuery.status,
        provider: legacyQuery.provider,
        contentType: legacyQuery.contentType,
        search: legacyQuery.search,
        type: legacyQuery.type,
        sortBy: legacyQuery.sortBy,
        sortOrder: legacyQuery.sortOrder,
      })

      return createJsonApiResponse(req, ok({
        items: data.items,
        total: data.total,
        page,
        pageSize,
      }))
    }
  },
})

export const POST = withV1Route({
  action: 'admin:media:write',
  requireAccess: { action: 'write' as Action, scope: 'media' as Scope },
  schemas: { body: AdminCreateMediaAssetRequestSchema },
  handler: async ({ req, serviceContext, body, userId }) => {

    const media = await createMediaAssetRepository()
    const service = createAdminMediaAssetService({
      media,
      storage: getStorageProvider(),
    }, serviceContext)

    const created = await service.createMediaAsset({ ...body!, createdBy: userId })
    return createJsonApiResponse(req, ok(created))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
