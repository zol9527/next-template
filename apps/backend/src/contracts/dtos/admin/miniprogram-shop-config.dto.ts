import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// =============================================================================
// Miniprogram Shop VIP Banner Config DTOs
// =============================================================================

/**
 * 跳转链接类型枚举
 */
export const ShopBannerLinkTypeEnum = z.enum(['product', 'ad', 'custom', 'none'])

export type ShopBannerLinkType = z.infer<typeof ShopBannerLinkTypeEnum>

/**
 * 跳转链接类型描述映射
 */
export const ShopBannerLinkTypeDescriptions: Record<ShopBannerLinkType, string> = {
  product: '商品详情',
  ad: '广告页面',
  custom: '自定义链接',
  none: '不跳转',
}

/**
 * 商城 VIP Banner 配置 Schema
 */
export const MiniprogramShopBannerConfigSchema = z
  .object({
    enabled: z.boolean().default(true).openapi({ description: '是否启用 VIP Banner' }),
    title: z.string().min(1).default('年度会员 · 全站畅学').openapi({ description: 'Banner 主标题' }),
    subtitle: z.string().min(1).default('128 门精品课程无限次学习').openapi({ description: 'Banner 副标题' }),
    linkType: ShopBannerLinkTypeEnum.default('none').openapi({ description: '跳转类型' }),
    linkUrl: z.string().nullable().optional().openapi({ description: '跳转链接（当 linkType 为 custom 时使用）' }),
    productId: z.string().nullable().optional().openapi({ description: '关联商品 ID（当 linkType 为 product 时使用）' }),
  })
  .openapi({ description: '商城 VIP Banner 配置' })

export type MiniprogramShopBannerConfig = z.infer<typeof MiniprogramShopBannerConfigSchema>

/**
 * 更新商城 VIP Banner 配置请求 Schema
 */
export const UpdateMiniprogramShopBannerConfigRequestSchema = MiniprogramShopBannerConfigSchema.openapi({
  description: '更新商城 VIP Banner 配置请求',
})

export type UpdateMiniprogramShopBannerConfigRequest = z.infer<typeof UpdateMiniprogramShopBannerConfigRequestSchema>
