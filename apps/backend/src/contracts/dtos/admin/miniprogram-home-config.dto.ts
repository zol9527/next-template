import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// =============================================================================
// Miniprogram Home Banner Config DTOs
// =============================================================================

/**
 * 跳转链接类型枚举
 */
export const HomeBannerLinkTypeEnum = z.enum(['product', 'ad', 'custom', 'none'])

export type HomeBannerLinkType = z.infer<typeof HomeBannerLinkTypeEnum>

/**
 * 跳转链接类型描述映射
 */
export const HomeBannerLinkTypeDescriptions: Record<HomeBannerLinkType, string> = {
  product: '商品详情',
  ad: '广告页面',
  custom: '自定义链接',
  none: '不跳转',
}

/**
 * 首页 Banner 配置 Schema
 */
export const MiniprogramHomeBannerConfigSchema = z
  .object({
    enabled: z.boolean().default(true).openapi({ description: '是否启用首页 Banner' }),
    tagText: z.string().min(1).default('限时免费').openapi({ description: '标签文字' }),
    title: z.string().min(1).default('零基础入门\n数据分析实战课').openapi({ description: 'Banner 主标题' }),
    subtitle: z.string().min(1).default('前 100 名报名免费').openapi({ description: 'Banner 副标题' }),
    linkType: HomeBannerLinkTypeEnum.default('none').openapi({ description: '跳转类型' }),
    linkUrl: z.string().nullable().optional().openapi({ description: '跳转链接（当 linkType 为 custom 时使用）' }),
    productId: z.string().nullable().optional().openapi({ description: '关联商品 ID（当 linkType 为 product 时使用）' }),
  })
  .openapi({ description: '首页 Banner 配置' })

export type MiniprogramHomeBannerConfig = z.infer<typeof MiniprogramHomeBannerConfigSchema>

/**
 * 更新首页 Banner 配置请求 Schema
 */
export const UpdateMiniprogramHomeBannerConfigRequestSchema = MiniprogramHomeBannerConfigSchema.openapi({
  description: '更新首页 Banner 配置请求',
})

export type UpdateMiniprogramHomeBannerConfigRequest = z.infer<typeof UpdateMiniprogramHomeBannerConfigRequestSchema>
