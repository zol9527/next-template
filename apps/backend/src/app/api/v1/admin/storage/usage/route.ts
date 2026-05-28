import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { getStorageProvider } from '@/lib/storage/helper'
import { createMediaAssetRepository } from '@/repositories/factory'
import { createAdminMediaAssetService } from '@/services/core/admin-media-asset.service'

/**
 * GET /api/v1/admin/storage/usage
 *
 * Description: 获取存储空间使用情况统计
 *
 * Response:
 *   200: 存储使用情况
 *   401: 未授权
 *   403: 无权限
 */
export const GET = withV1Route({
  action: 'admin:media:read',
  requireAccess: { action: 'read' as Action, scope: 'media' as Scope },
  handler: async ({ req, serviceContext }) => {
    const media = await createMediaAssetRepository()
    const service = createAdminMediaAssetService({
      media,
      storage: getStorageProvider(),
    }, serviceContext)

    const usage = await service.getStorageUsage()
    return createJsonApiResponse(req, ok(usage))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
