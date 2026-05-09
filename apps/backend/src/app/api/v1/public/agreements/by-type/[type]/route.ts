import type { NextRequest } from 'next/server'

import { z } from 'zod'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createAgreementRepository } from '@/repositories/factory'
import { createPublicSiteConfigService } from '@/services/core/public-site-config.service'
import { createSiteConfigRepository, createAnnouncementRepository } from '@/repositories/factory'

// 定义 params schema
const ByTypeParamsSchema = z.object({
  type: z.enum(['USER_AGREEMENT', 'PRIVACY_POLICY', 'ABOUT_US']),
})

type PublicAgreementRouteHandler = (
  req: NextRequest,
  ctx: { params: Promise<{ type: string }> }
) => Promise<Response>

/**
 * Function: GET
 *
 * Description: 根据协议类型获取单个协议（公开接口）
 */
const GET_IMPL = withV1Route({
  action: 'public:agreement:view',
  requireAuth: false,
  schemas: {
    params: ByTypeParamsSchema,
  },
  handler: async ({ req, serviceContext, params }) => {
    if (!serviceContext) {
      return createJsonApiResponse(
        req,
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Service context not available' } },
        { status: 500 },
      )
    }

    const agreements = await createAgreementRepository()
    const siteConfig = await createSiteConfigRepository()
    const announcements = await createAnnouncementRepository()

    const service = createPublicSiteConfigService(
      { agreements, siteConfig, announcements },
      serviceContext
    )

    // 获取协议
    const agreement = await service.getAgreementByType(params.type)

    if (!agreement) {
      return createJsonApiResponse(
        req,
        { success: false, error: { code: 'NOT_FOUND', message: 'Agreement not found' } },
        { status: 404 },
      )
    }

    return createJsonApiResponse(req, ok(agreement))
  },
})

// Next.js 16 对动态路由上下文使用更宽的 string 类型，这里在导出层做兼容适配。
export const GET = GET_IMPL as unknown as PublicAgreementRouteHandler

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
