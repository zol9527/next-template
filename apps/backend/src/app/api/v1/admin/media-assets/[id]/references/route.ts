import type { NextRequest } from 'next/server'

import { z } from 'zod'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMediaAssetRepository } from '@/repositories/factory'

/**
 * GET /api/v1/admin/media-assets/[id]/references
 *
 * Description: 获取指定媒体资产的所有引用关系
 *
 * Response:
 *   200: 引用列表
 *   401: 未授权
 *   403: 无权限
 *   404: 媒体资产不存在
 */
export const GET = withV1Route({
  action: 'admin:media:read',
  requireAccess: { action: 'read' as Action, scope: 'media' as Scope },
  schemas: {
    params: z.object({ id: z.string().uuid() })
  },
  handler: async ({ req, serviceContext, params }) => {
    const mediaRepo = await createMediaAssetRepository()

    // 验证媒体资产是否存在
    const asset = await mediaRepo.getMediaAssetById(serviceContext, {
      assetId: params.id,
    })

    if (!asset) {
      return createJsonApiResponse(req, {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '媒体资产不存在',
        },
      }, { status: 404 })
    }

    // 获取引用列表
    const references = await mediaRepo.getMediaReferences(serviceContext, {
      assetId: params.id,
    })

    return createJsonApiResponse(req, ok({
      references,
      count: references.length,
    }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
