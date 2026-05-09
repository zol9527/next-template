import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// =============================================================================
// Public Site Config DTOs
// =============================================================================

/**
 * 公共站点配置 Schema（仅包含公开字段）
 */
export const PublicSiteConfigSchema = z
  .object({
    siteName: z.string().openapi({ description: '站点名称' }),
    logoUrl: z.string().url().nullable().optional().openapi({ description: 'Logo URL 或品牌图片地址' }),
    contactPhone: z.string().nullable().optional().openapi({ description: '客服联系电话' }),
    contactWechat: z.string().nullable().optional().openapi({ description: '客服微信号' }),
    contactEmail: z.string().nullable().optional().openapi({ description: '客服邮箱' }),
    icpFiling: z.string().nullable().optional().openapi({ description: 'ICP备案信息' }),
    copyright: z.string().nullable().optional().openapi({ description: '版权信息' }),
    updatedAt: z.string().openapi({ description: '更新时间 ISO（用于版本控制）' }),
  })
  .openapi({ description: '公共站点配置' })

export type PublicSiteConfig = z.infer<typeof PublicSiteConfigSchema>

// =============================================================================
// Public Announcement DTOs
// =============================================================================

/**
 * 公共公告 Schema（仅包含公开字段）
 */
export const PublicAnnouncementSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '公告 ID' }),
    title: z.string().openapi({ description: '公告标题' }),
    content: z.string().openapi({ description: '公告内容（富文本）' }),
    type: z.enum(['NOTICE', 'ACTIVITY', 'MAINTENANCE']).openapi({
      description: '公告类型：NOTICE（通知）、ACTIVITY（活动）、MAINTENANCE（维护）',
    }),
    priority: z.number().int().openapi({ description: '优先级' }),
  })
  .openapi({ description: '公共公告' })

export type PublicAnnouncement = z.infer<typeof PublicAnnouncementSchema>

/**
 * 公告列表响应 Schema
 */
export const PublicAnnouncementListResponseSchema = z
  .object({
    items: z.array(PublicAnnouncementSchema).openapi({ description: '公告列表' }),
  })
  .openapi({ description: '公共公告列表响应' })

export type PublicAnnouncementListResponse = z.infer<typeof PublicAnnouncementListResponseSchema>

/**
 * 公告列表查询参数 Schema
 */
export const PublicAnnouncementListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(20).openapi({
      description: '返回数量（默认 20，最大 50）',
    }),
  })
  .openapi({ description: '公共公告列表查询参数' })

export type PublicAnnouncementListQuery = z.infer<typeof PublicAnnouncementListQuerySchema>

// =============================================================================
// Public Agreement DTOs
// =============================================================================

/**
 * 公共协议 Schema（仅包含公开字段）
 */
export const PublicAgreementSchema = z
  .object({
    type: z.enum(['USER_AGREEMENT', 'PRIVACY_POLICY', 'ABOUT_US']).openapi({
      description: '协议类型：USER_AGREEMENT（用户协议）、PRIVACY_POLICY（隐私政策）、ABOUT_US（关于我们）',
    }),
    title: z.string().openapi({ description: '协议标题' }),
    content: z.string().openapi({ description: '协议内容（富文本）' }),
    version: z.string().openapi({ description: '版本号' }),
    effectiveAt: z.string().openapi({ description: '生效日期 ISO' }),
  })
  .openapi({ description: '公共协议' })

export type PublicAgreement = z.infer<typeof PublicAgreementSchema>

/**
 * 协议响应 Schema
 */
export const PublicAgreementResponseSchema = PublicAgreementSchema.openapi({
  description: '公共协议响应',
})

export type PublicAgreementResponse = z.infer<typeof PublicAgreementResponseSchema>

/**
 * 获取协议查询参数 Schema
 */
export const GetAgreementQuerySchema = z
  .object({
    type: z.enum(['USER_AGREEMENT', 'PRIVACY_POLICY', 'ABOUT_US']).openapi({
      description: '协议类型：USER_AGREEMENT（用户协议）、PRIVACY_POLICY（隐私政策）、ABOUT_US（关于我们）',
    }),
  })
  .openapi({ description: '获取协议查询参数' })

export type GetAgreementQuery = z.infer<typeof GetAgreementQuerySchema>

// =============================================================================
// Combined Public Config Response
// =============================================================================

/**
 * 统一公共配置响应 Schema（用于小程序一次性拉取所有配置）
 */
export const PublicConfigResponseSchema = z
  .object({
    siteConfig: PublicSiteConfigSchema.openapi({ description: '站点配置' }),
    announcements: z.array(PublicAnnouncementSchema).openapi({ description: '公告列表' }),
    agreements: z
      .record(
        z.enum(['USER_AGREEMENT', 'PRIVACY_POLICY', 'ABOUT_US']),
        PublicAgreementSchema.nullable(),
      )
      .openapi({ description: '协议映射（key 为协议类型）' }),
  })
  .openapi({ description: '统一公共配置响应' })

export type PublicConfigResponse = z.infer<typeof PublicConfigResponseSchema>
