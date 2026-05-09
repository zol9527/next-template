import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { AdminOssUploadPolicyRequestSchema } from '@/contracts/dtos/admin/oss-upload-policy.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { getStorageProvider } from '@/lib/storage/helper'
import { createMediaAssetRepository } from '@/repositories/factory'
import { createAdminMediaAssetService } from '@/services/core/admin-media-asset.service'

export const POST = withV1Route({
  action: 'admin:storage:write',
  requireAccess: { action: 'write' as Action, scope: 'storage' as Scope },
  schemas: { body: AdminOssUploadPolicyRequestSchema },
  handler: async ({ req, serviceContext, body }) => {

    const media = await createMediaAssetRepository()
    const service = createAdminMediaAssetService({
      media,
      storage: getStorageProvider(),
    }, serviceContext)

    const data = await service.issueUploadPolicy(body!)
    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
