import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { GetAgreementQuerySchema } from '@/contracts/dtos/public/site-config.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import {
  createAgreementRepository,
  createAnnouncementRepository,
  createSiteConfigRepository,
} from '@/repositories/factory'
import { createPublicSiteConfigService } from '@/services/core/public-site-config.service'

/**
 * Function: GET
 *
 * Description: 根据类型获取有效协议
 */
export const GET = withV1Route({
  action: 'public:agreement:get',
  schemas: {
    query: GetAgreementQuerySchema,
  },
  handler: async ({ req, serviceContext, query }) => {
    const [agreements, announcements, siteConfig] = await Promise.all([
      createAgreementRepository(),
      createAnnouncementRepository(),
      createSiteConfigRepository(),
    ])
    const service = createPublicSiteConfigService(
      { agreements, announcements, siteConfig },
      serviceContext,
    )
    const data = await service.getAgreementByType(query.type)

    if (!data) {
      return createJsonApiResponse(req, { success: false, error: { code: 'NOT_FOUND', message: 'Agreement not found' } }, { status: 404 })
    }

    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
