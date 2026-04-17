import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { IdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { getStorageProvider } from '@/lib/storage/helper'
import { createMediaAssetRepository } from '@/repositories/factory'
import { createAdminMediaAssetService } from '@/services/core/admin-media-asset.service'

/**
 * DELETE /api/v1/admin/media-assets/:id
 *
 * Description: 删除指定的媒体资源（包括 OSS 文件和数据库记录）
 *
 * Path Parameters:
 *   id: string - 媒体资源 ID
 *
 * Response:
 *   200: 删除成功
 *   401: 未授权
 *   403: 无权限
 *   404: 媒体资源不存在
 */
export const DELETE = withV1Route({
  action: 'admin:media:write',
  requireAccess: { action: 'write' as Action, scope: 'media' as Scope },
  schemas: { params: IdParamsSchema },
  handler: async ({ req, serviceContext, params }) => {
    const media = await createMediaAssetRepository()
    const service = createAdminMediaAssetService({
      media,
      storage: getStorageProvider(),
    }, serviceContext)

    const result = await service.deleteMediaAsset({ assetId: params.id })
    return createJsonApiResponse(req, ok(result))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
