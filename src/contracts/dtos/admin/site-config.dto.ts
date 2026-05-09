import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

const MAX_LOGO_URL_LENGTH = 191

// =============================================================================
// Site Config DTOs
// =============================================================================

/**
 * 站点配置 Schema
 */
export const SiteConfigSchema = z
  .object({
    id: z.string().openapi({ description: '配置 ID（单例模式使用固定 ID 或 UUID）' }),
    siteName: z.string().min(1).openapi({ description: '站点名称' }),
    logoUrl: z.string().url().nullable().optional().openapi({ description: 'Logo URL 或品牌图片地址' }),
    contactPhone: z.string().nullable().optional().openapi({ description: '客服联系电话' }),
    contactWechat: z.string().nullable().optional().openapi({ description: '客服微信号' }),
    contactEmail: z.string().nullable().optional().openapi({ description: '客服邮箱' }),
    icpFiling: z.string().nullable().optional().openapi({ description: 'ICP备案信息' }),
    copyright: z.string().nullable().optional().openapi({ description: '版权信息' }),
    createdAt: z.string().openapi({ description: '创建时间 ISO' }),
    updatedAt: z.string().openapi({ description: '更新时间 ISO' }),
  })
  .openapi({ description: '站点配置' })

export type SiteConfig = z.infer<typeof SiteConfigSchema>

/**
 * 更新站点配置请求 Schema
 */
export const UpdateSiteConfigRequestSchema = z
  .object({
    siteName: z.string().min(1).openapi({ description: '站点名称' }),
    logoUrl: z
      .string()
      .url()
      .max(MAX_LOGO_URL_LENGTH, `Logo URL 不能超过 ${MAX_LOGO_URL_LENGTH} 个字符`)
      .nullable()
      .optional()
      .openapi({ description: `Logo URL 或品牌图片地址（最长 ${MAX_LOGO_URL_LENGTH} 字符）` }),
    contactPhone: z.string().nullable().optional().openapi({ description: '客服联系电话' }),
    contactWechat: z.string().nullable().optional().openapi({ description: '客服微信号' }),
    contactEmail: z.string().nullable().optional().openapi({ description: '客服邮箱' }),
    icpFiling: z.string().nullable().optional().openapi({ description: 'ICP备案信息' }),
    copyright: z.string().nullable().optional().openapi({ description: '版权信息' }),
  })
  .openapi({ description: '更新站点配置请求' })

export type UpdateSiteConfigRequest = z.infer<typeof UpdateSiteConfigRequestSchema>

// =============================================================================
// Announcement DTOs
// =============================================================================

/**
 * 公告类型枚举
 */
export const AnnouncementTypeEnum = z.enum(['NOTICE', 'ACTIVITY', 'MAINTENANCE'])

export type AnnouncementType = z.infer<typeof AnnouncementTypeEnum>

/**
 * 公告类型描述映射
 */
export const AnnouncementTypeDescriptions: Record<AnnouncementType, string> = {
  NOTICE: '通知',
  ACTIVITY: '活动',
  MAINTENANCE: '维护',
}

/**
 * 公告 Schema
 */
export const AnnouncementSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '公告 ID' }),
    title: z.string().min(1).openapi({ description: '公告标题' }),
    content: z.string().openapi({ description: '公告内容（富文本）' }),
    type: AnnouncementTypeEnum.openapi({
      description: '公告类型：NOTICE（通知）、ACTIVITY（活动）、MAINTENANCE（维护）',
    }),
    isActive: z.boolean().openapi({ description: '是否启用' }),
    priority: z.number().int().openapi({ description: '优先级（数字越大优先级越高）' }),
    startAt: z.string().nullable().optional().openapi({ description: '生效开始时间 ISO（可选）' }),
    endAt: z.string().nullable().optional().openapi({ description: '生效结束时间 ISO（可选）' }),
    createdAt: z.string().openapi({ description: '创建时间 ISO' }),
    updatedAt: z.string().openapi({ description: '更新时间 ISO' }),
  })
  .openapi({ description: '公告' })

export type Announcement = z.infer<typeof AnnouncementSchema>

/**
 * 公告列表响应 Schema
 */
export const AnnouncementListResponseSchema = z
  .object({
    items: z.array(AnnouncementSchema).openapi({ description: '公告列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标' }),
  })
  .openapi({ description: '公告列表响应' })

export type AnnouncementListResponse = z.infer<typeof AnnouncementListResponseSchema>

/**
 * 公告列表查询参数 Schema
 */
export const AnnouncementListQuerySchema = z
  .object({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(50)
      .openapi({ description: '分页大小（默认 50，最大 100）' }),
    cursor: z.string().nullable().optional().openapi({ description: '分页游标（可选）' }),
  })
  .openapi({ description: '公告列表查询参数' })

export type AnnouncementListQuery = z.infer<typeof AnnouncementListQuerySchema>

/**
 * 创建公告请求 Schema
 */
export const CreateAnnouncementRequestSchema = z
  .object({
    title: z.string().min(1).max(200).openapi({ description: '公告标题（1-200 字符）' }),
    content: z.string().min(1).openapi({ description: '公告内容（富文本）' }),
    type: AnnouncementTypeEnum.openapi({ description: '公告类型' }),
    isActive: z.boolean().optional().default(true).openapi({ description: '是否启用（默认 true）' }),
    priority: z.number().int().optional().default(0).openapi({ description: '优先级（默认 0）' }),
    startAt: z.string().nullable().optional().openapi({ description: '生效开始时间 ISO（可选）' }),
    endAt: z.string().nullable().optional().openapi({ description: '生效结束时间 ISO（可选）' }),
  })
  .openapi({ description: '创建公告请求' })

export type CreateAnnouncementRequest = z.infer<typeof CreateAnnouncementRequestSchema>

/**
 * 更新公告请求 Schema
 */
export const UpdateAnnouncementRequestSchema = z
  .object({
    title: z.string().min(1).max(200).optional().openapi({ description: '公告标题（1-200 字符）' }),
    content: z.string().min(1).optional().openapi({ description: '公告内容（富文本）' }),
    type: AnnouncementTypeEnum.optional().openapi({ description: '公告类型' }),
    isActive: z.boolean().optional().openapi({ description: '是否启用' }),
    priority: z.number().int().optional().openapi({ description: '优先级' }),
    startAt: z.string().nullable().optional().openapi({ description: '生效开始时间 ISO（可选）' }),
    endAt: z.string().nullable().optional().openapi({ description: '生效结束时间 ISO（可选）' }),
  })
  .openapi({ description: '更新公告请求' })

export type UpdateAnnouncementRequest = z.infer<typeof UpdateAnnouncementRequestSchema>

/**
 * 切换公告启用状态请求 Schema
 */
export const ToggleAnnouncementActiveRequestSchema = z
  .object({
    isActive: z.boolean().openapi({ description: '是否启用' }),
  })
  .openapi({ description: '切换公告启用状态请求' })

export type ToggleAnnouncementActiveRequest = z.infer<typeof ToggleAnnouncementActiveRequestSchema>

// =============================================================================
// Agreement DTOs
// =============================================================================

/**
 * 协议类型枚举
 */
export const AgreementTypeEnum = z.enum(['USER_AGREEMENT', 'PRIVACY_POLICY', 'ABOUT_US'])

export type AgreementType = z.infer<typeof AgreementTypeEnum>

/**
 * 协议类型描述映射
 */
export const AgreementTypeDescriptions: Record<AgreementType, string> = {
  USER_AGREEMENT: '用户协议',
  PRIVACY_POLICY: '隐私政策',
  ABOUT_US: '关于我们',
}

/**
 * 协议 Schema
 */
export const AgreementSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '协议 ID' }),
    type: AgreementTypeEnum.openapi({
      description: '协议类型：USER_AGREEMENT（用户协议）、PRIVACY_POLICY（隐私政策）、ABOUT_US（关于我们）',
    }),
    title: z.string().min(1).openapi({ description: '协议标题' }),
    content: z.string().min(1).openapi({ description: '协议内容（富文本）' }),
    version: z.string().min(1).openapi({ description: '版本号' }),
    isActive: z.boolean().openapi({ description: '是否启用' }),
    effectiveAt: z.string().openapi({ description: '生效日期 ISO' }),
    createdAt: z.string().openapi({ description: '创建时间 ISO' }),
    updatedAt: z.string().openapi({ description: '更新时间 ISO' }),
  })
  .openapi({ description: '协议' })

export type Agreement = z.infer<typeof AgreementSchema>

/**
 * 协议列表响应 Schema
 */
export const AgreementListResponseSchema = z
  .object({
    items: z.array(AgreementSchema).openapi({ description: '协议列表' }),
  })
  .openapi({ description: '协议列表响应' })

export type AgreementListResponse = z.infer<typeof AgreementListResponseSchema>

/**
 * 创建或更新协议请求 Schema
 */
export const UpsertAgreementRequestSchema = z
  .object({
    type: AgreementTypeEnum.openapi({ description: '协议类型' }),
    title: z.string().min(1).max(200).openapi({ description: '协议标题（1-200 字符）' }),
    content: z.string().min(1).openapi({ description: '协议内容（富文本）' }),
    version: z.string().min(1).max(50).openapi({ description: '版本号（1-50 字符）' }),
    isActive: z.boolean().optional().default(true).openapi({ description: '是否启用（默认 true）' }),
    effectiveAt: z.string().optional().openapi({ description: '生效日期 ISO（可选，默认当前时间）' }),
  })
  .openapi({ description: '创建或更新协议请求' })

export type UpsertAgreementRequest = z.infer<typeof UpsertAgreementRequestSchema>

/**
 * 更新协议请求 Schema
 */
export const UpdateAgreementRequestSchema = z
  .object({
    title: z.string().min(1).max(200).optional().openapi({ description: '协议标题（1-200 字符）' }),
    content: z.string().min(1).optional().openapi({ description: '协议内容（富文本）' }),
    version: z.string().min(1).max(50).optional().openapi({ description: '版本号（1-50 字符）' }),
    isActive: z.boolean().optional().openapi({ description: '是否启用' }),
    effectiveAt: z.string().optional().openapi({ description: '生效日期 ISO' }),
  })
  .openapi({ description: '更新协议请求' })

export type UpdateAgreementRequest = z.infer<typeof UpdateAgreementRequestSchema>

// =============================================================================
// Feature Flags DTOs
// =============================================================================

/**
 * 功能开关名称枚举
 */
export const FeatureFlagNameEnum = z.enum([
  'maintenance_mode',
  'payment_enabled',
  'registration_enabled',
  'announcement_enabled',
  'promotion_enabled',
  'coupon_enabled',
  'ai_text_generation',
  'ai_image_generation',
  'ai_pricing_suggestion',
])

export type FeatureFlagName = z.infer<typeof FeatureFlagNameEnum>

/**
 * 功能开关列表响应 Schema
 */
export const FeatureFlagsListResponseSchema = z
  .object({
    flags: z.record(z.string(), z.boolean()).openapi({
      description: '功能开关映射表，key 为开关名，value 为启用状态',
    }),
  })
  .openapi({ description: '功能开关列表响应' })

export type FeatureFlagsListResponse = z.infer<typeof FeatureFlagsListResponseSchema>

/**
 * 切换功能开关请求 Schema
 */
export const ToggleFeatureFlagRequestSchema = z
  .object({
    enabled: z.boolean().openapi({ description: '是否启用' }),
  })
  .openapi({ description: '切换功能开关请求' })

export type ToggleFeatureFlagRequest = z.infer<typeof ToggleFeatureFlagRequestSchema>

/**
 * 功能开关键名路径参数 Schema
 */
export const FeatureFlagKeyParamSchema = z
  .object({
    key: FeatureFlagNameEnum.openapi({ description: '功能开关键名' }),
  })
  .openapi({ description: '功能开关键名路径参数' })

export type FeatureFlagKeyParam = z.infer<typeof FeatureFlagKeyParamSchema>

/**
 * 协议类型路径参数 Schema
 */
export const AgreementTypeParamSchema = z
  .object({
    type: AgreementTypeEnum.openapi({ description: '协议类型' }),
  })
  .openapi({ description: '协议类型路径参数' })

export type AgreementTypeParam = z.infer<typeof AgreementTypeParamSchema>
