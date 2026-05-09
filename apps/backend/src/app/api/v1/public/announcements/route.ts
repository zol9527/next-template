import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { PublicAnnouncementListQuerySchema } from '@/contracts/dtos/public/site-config.dto'
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
 * Description: 获取有效公告列表（按优先级降序）
 */
export const GET = withV1Route({
  action: 'public:announcement:list',
  schemas: {
    query: PublicAnnouncementListQuerySchema,
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
    const data = await service.getActiveAnnouncements(query)

    return createJsonApiResponse(req, ok({ items: data }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
