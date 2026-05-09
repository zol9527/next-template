import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import {
  createSiteConfigRepository,
  createAnnouncementRepository,
  createAgreementRepository,
} from '@/repositories/factory'
import { createPublicSiteConfigService } from '@/services/core/public-site-config.service'

/**
 * Function: GET
 *
 * Description: 获取统一配置响应（包含站点配置、公告列表和协议映射）
 * 用于小程序一次性拉取所有配置
 */
export const GET = withV1Route({
  action: 'public:config:get',
  handler: async ({ req, serviceContext }) => {
    const [siteConfig, announcements, agreements] = await Promise.all([
      createSiteConfigRepository(),
      createAnnouncementRepository(),
      createAgreementRepository(),
    ])

    const service = createPublicSiteConfigService(
      {
        siteConfig,
        announcements,
        agreements,
      },
      serviceContext,
    )

    const data = await service.getUnifiedConfig()

    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
