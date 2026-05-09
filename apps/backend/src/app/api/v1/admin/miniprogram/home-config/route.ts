import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { UpdateMiniprogramHomeBannerConfigRequestSchema } from '@/contracts/dtos/admin/miniprogram-home-config.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSystemSettingsRepository } from '@/repositories/factory'
import type { MiniprogramHomeBannerConfig } from '@/contracts/dtos/admin/miniprogram-home-config.dto'

/** SystemSetting 中存储首页 Banner 配置的 key */
const HOME_BANNER_CONFIG_KEY = 'miniprogram.home.banner_config'

/** 默认配置 */
const DEFAULT_CONFIG: MiniprogramHomeBannerConfig = {
  enabled: true,
  tagText: '限时免费',
  title: '零基础入门\n数据分析实战课',
  subtitle: '前 100 名报名免费',
  linkType: 'none',
  linkUrl: null,
  productId: null,
}

/**
 * GET /api/v1/admin/miniprogram/home-config
 *
 * 获取首页 Banner 配置
 */
export const GET = withV1Route({
  action: 'admin:miniprogram:home:config:view',
  requireAccess: { action: 'read' as Action, scope: 'miniprogram.home-config' as Scope },
  handler: async ({ req, serviceContext }) => {
    const repo = await createSystemSettingsRepository()

    const repoCtx = {
      traceId: serviceContext.traceId,
      logger: serviceContext.logger.child({ layer: 'repository' }),
    }

    const raw = await repo.getSetting<string>(repoCtx, { key: HOME_BANNER_CONFIG_KEY })

    // 如果没有存储的配置，返回默认值
    const config: MiniprogramHomeBannerConfig = raw ? JSON.parse(raw) : DEFAULT_CONFIG

    return createJsonApiResponse(req, ok(config))
  },
})

/**
 * PUT /api/v1/admin/miniprogram/home-config
 *
 * 更新首页 Banner 配置
 */
export const PUT = withV1Route({
  action: 'admin:miniprogram:home:config:update',
  requireAccess: { action: 'write' as Action, scope: 'miniprogram.home-config' as Scope },
  schemas: { body: UpdateMiniprogramHomeBannerConfigRequestSchema },
  handler: async ({ req, serviceContext, body }) => {
    const repo = await createSystemSettingsRepository()

    const repoCtx = {
      traceId: serviceContext.traceId,
      logger: serviceContext.logger.child({ layer: 'repository' }),
    }

    const config = body!
    await repo.updateSetting(repoCtx, {
      key: HOME_BANNER_CONFIG_KEY,
      value: JSON.stringify(config),
    })

    serviceContext.logger.info({
      action: 'admin_miniprogram_home_config.update',
    })

    return createJsonApiResponse(req, ok(config))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
