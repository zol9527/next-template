import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { UpdateMiniprogramShopBannerConfigRequestSchema } from '@/contracts/dtos/admin/miniprogram-shop-config.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSystemSettingsRepository } from '@/repositories/factory'
import type { MiniprogramShopBannerConfig } from '@/contracts/dtos/admin/miniprogram-shop-config.dto'

/** SystemSetting 中存储商城 Banner 配置的 key */
const SHOP_BANNER_CONFIG_KEY = 'miniprogram.shop.banner_config'

/** 默认配置 */
const DEFAULT_CONFIG: MiniprogramShopBannerConfig = {
  enabled: true,
  title: '年度会员 · 全站畅学',
  subtitle: '128 门精品课程无限次学习',
  linkType: 'none',
  linkUrl: null,
  productId: null,
}

export const GET = withV1Route({
  action: 'admin:miniprogram:shop:config:view',
  requireAccess: { action: 'read' as Action, scope: 'miniprogram.shop-config' as Scope },
  handler: async ({ req, serviceContext }) => {
    const repo = await createSystemSettingsRepository()

    const repoCtx = {
      traceId: serviceContext.traceId,
      logger: serviceContext.logger.child({ layer: 'repository' }),
    }

    const raw = await repo.getSetting<string>(repoCtx, { key: SHOP_BANNER_CONFIG_KEY })

    // 如果没有存储的配置，返回默认值
    const config: MiniprogramShopBannerConfig = raw ? JSON.parse(raw) : DEFAULT_CONFIG

    return createJsonApiResponse(req, ok(config))
  },
})

export const PUT = withV1Route({
  action: 'admin:miniprogram:shop:config:update',
  requireAccess: { action: 'write' as Action, scope: 'miniprogram.shop-config' as Scope },
  schemas: { body: UpdateMiniprogramShopBannerConfigRequestSchema },
  handler: async ({ req, serviceContext, body }) => {
    const repo = await createSystemSettingsRepository()

    const repoCtx = {
      traceId: serviceContext.traceId,
      logger: serviceContext.logger.child({ layer: 'repository' }),
    }

    const config = body!
    await repo.updateSetting(repoCtx, {
      key: SHOP_BANNER_CONFIG_KEY,
      value: JSON.stringify(config),
    })

    serviceContext.logger.info({
      action: 'admin_miniprogram_shop_config.update',
    })

    return createJsonApiResponse(req, ok(config))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
