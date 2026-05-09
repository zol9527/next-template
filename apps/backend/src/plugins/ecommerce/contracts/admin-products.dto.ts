import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const AdminProductStatusSchema = z
  .enum(['draft', 'published', 'unpublished', 'archived'])
  .openapi({ description: '商品状态' })

export type AdminProductStatus = z.infer<typeof AdminProductStatusSchema>

export const AdminProductKindSchema = z
  .enum(['course', 'certificate'])
  .openapi({ description: '商品类型（本期仅编辑通用字段）' })

export type AdminProductKind = z.infer<typeof AdminProductKindSchema>

export const MoneySchema = z
  .object({
    amount: z.string().openapi({ description: '使用字符串表达 decimal' }),
    currencyCode: z.string().openapi({ description: '币种（全站单一默认值，如 CNY）' }),
  })
  .openapi({ description: '金额（单价）' })

export type Money = z.infer<typeof MoneySchema>

export const AdminProductSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '商品 ID' }),
    name: z.string().openapi({ description: '商品名称' }),
    slug: z.string().nullable().openapi({ description: 'URL 友好标识' }),
    summary: z.string().nullable().openapi({ description: '短简介' }),
    description: z.string().nullable().openapi({ description: '详情文本' }),
    kind: AdminProductKindSchema.openapi({ description: '商品类型' }),
    status: AdminProductStatusSchema.openapi({ description: '商品状态' }),
    price: MoneySchema.openapi({ description: '基础售价（单价）' }),
    originalPrice: MoneySchema.nullable().openapi({ description: '原价/划线价（可选）' }),
    stockQuantity: z.number().int().min(0).nullable().openapi({ description: '库存数量（null 表示不控库存）' }),
    isFeatured: z.boolean().openapi({ description: '是否推荐/精选' }),
    tags: z.array(z.string()).openapi({ description: '商品标签（可为空数组）' }),
    categoryIds: z.array(z.string().uuid()).default([]).openapi({ description: '分类 ID 列表' }),
    coverAssetId: z.string().uuid().nullable().openapi({ description: '封面媒体 ID（可选）' }),
    coverUrl: z.string().nullable().optional().openapi({ description: '封面图片 URL（可选，实时生成）' }),
    mediaAssetIds: z.array(z.string().uuid()).default([]).openapi({ description: '媒体资源 ID 列表（可选）' }),
    mediaUrls: z.array(z.string()).default([]).optional().openapi({ description: '媒体图片 URL 列表（实时生成）' }),
    // 服务保障标签（如"正品保障"、"7天无理由"、"极速退款"），从 extensions.serviceGuarantees 提取
    serviceGuarantees: z.array(z.string()).default(['正品保障']).openapi({ description: '服务保障标签（2-4个，默认：正品保障）' }),
    extensions: z.unknown().nullable().optional().openapi({ description: '扩展字段（可为空）' }),
    createdBy: z.string().uuid().nullable().optional().openapi({ description: '创建者 ID（可为空）' }),
    updatedBy: z.string().uuid().nullable().optional().openapi({ description: '更新者 ID（可为空）' }),
    createdAt: z.string().openapi({ description: '创建时间 ISO' }),
    updatedAt: z.string().openapi({ description: '更新时间 ISO' }),
    deletedAt: z.string().nullable().optional().openapi({ description: '删除时间 ISO（可为空）' }),
  })
  .openapi({ description: '后台商品' })

export type AdminProduct = z.infer<typeof AdminProductSchema>

export const AdminProductListResponseSchema = z
  .object({
    items: z.array(AdminProductSchema).openapi({ description: '商品列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标' }),
    totalCount: z.number().openapi({ description: '符合条件的记录总数' }),
  })
  .openapi({ description: '后台商品列表响应' })

export type AdminProductListResponse = z.infer<typeof AdminProductListResponseSchema>

export const AdminProductListQuerySchema = z
  .object({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(50)
      .openapi({ description: '分页大小（默认 50，最大 50）' }),
    cursor: z.string().nullable().optional().openapi({ description: '分页游标（可选）' }),
    keyword: z.string().optional().openapi({ description: '搜索关键词（商品名称）' }),
    status: AdminProductStatusSchema.optional().openapi({ description: '商品状态筛选' }),
    kind: AdminProductKindSchema.optional().openapi({ description: '商品类型筛选' }),
    categoryIds: z
      .union([z.string().uuid(), z.array(z.string().uuid())])
      .transform((val) => (Array.isArray(val) ? val : [val]))
      .optional()
      .openapi({ description: '分类 ID 列表筛选（包含任一分类）' }),
  })
  .openapi({ description: '后台商品列表查询参数' })

export type AdminProductListQuery = z.infer<typeof AdminProductListQuerySchema>

export const PriceAmountSchema = z
  .string()
  .min(1)
  .refine(
    (val) => {
      const num = parseFloat(val)
      return !isNaN(num) && num >= 0
    },
    { message: '价格必须是不小于 0 的数字' }
  )
  .refine(
    (val) => {
      const decimalParts = val.split('.')
      if (decimalParts.length === 1) return true
      return decimalParts[1].length <= 2
    },
    { message: '价格最多保留 2 位小数' }
  )

export const AdminCreateProductRequestSchema = z
  .object({
    name: z.string().min(1).openapi({ description: '商品名称' }),
    slug: z.string().min(1).nullable().optional().openapi({ description: 'URL 友好标识（可选）' }),
    kind: AdminProductKindSchema.openapi({ description: '商品类型' }),
    summary: z.string().nullable().optional().openapi({ description: '短简介' }),
    description: z.string().nullable().optional().openapi({ description: '详情文本' }),
    priceAmount: PriceAmountSchema.openapi({ description: '基础售价金额（decimal 字符串）' }),
    originalPriceAmount: PriceAmountSchema.nullable().optional().openapi({ description: '原价金额（decimal 字符串，可选）' }),
    stockQuantity: z.number().int().min(0).nullable().optional().openapi({ description: '库存数量（null 表示不控库存，可选）' }),
    isFeatured: z.boolean().optional().openapi({ description: '是否推荐/精选（可选，默认 false）' }),
    tags: z.array(z.string()).optional().openapi({ description: '商品标签（可选）' }),
    categoryIds: z.array(z.string().uuid()).optional().openapi({ description: '分类 ID 列表（可选）' }),
    coverAssetId: z.string().uuid().nullable().optional().openapi({ description: '封面媒体 ID（可选）' }),
    mediaAssetIds: z.array(z.string().uuid()).optional().openapi({ description: '媒体资源 ID 列表（可选）' }),
    serviceGuarantees: z.array(z.string()).min(2).max(4).optional().openapi({ description: '服务保障标签（2-4个，可选）' }),
  })
  .openapi({ description: '创建商品请求（通用字段）' })

export type AdminCreateProductRequest = z.infer<typeof AdminCreateProductRequestSchema>

export const AdminUpdateProductRequestSchema = z
  .object({
    name: z.string().min(1).optional().openapi({ description: '商品名称' }),
    slug: z.string().min(1).nullable().optional().openapi({ description: 'URL 友好标识（可选）' }),
    summary: z.string().nullable().optional().openapi({ description: '短简介' }),
    description: z.string().nullable().optional().openapi({ description: '详情文本' }),
    priceAmount: PriceAmountSchema.optional().openapi({ description: '基础售价金额（decimal 字符串）' }),
    originalPriceAmount: PriceAmountSchema.nullable().optional().openapi({ description: '原价金额（decimal 字符串，可选）' }),
    stockQuantity: z.number().int().min(0).nullable().optional().openapi({ description: '库存数量（null 表示不控库存，可选）' }),
    isFeatured: z.boolean().optional().openapi({ description: '是否推荐/精选（可选）' }),
    tags: z.array(z.string()).optional().openapi({ description: '商品标签（可选）' }),
    categoryIds: z.array(z.string().uuid()).optional().openapi({ description: '分类 ID 列表（可选）' }),
    coverAssetId: z.string().uuid().nullable().optional().openapi({ description: '封面媒体 ID（可选）' }),
    mediaAssetIds: z.array(z.string().uuid()).optional().openapi({ description: '媒体资源 ID 列表（可选）' }),
    serviceGuarantees: z.array(z.string()).min(2).max(4).optional().openapi({ description: '服务保障标签（2-4个，可选）' }),
  })
  .openapi({ description: '更新商品请求（通用字段）' })

export type AdminUpdateProductRequest = z.infer<typeof AdminUpdateProductRequestSchema>

export const AdminProductStatusUpdateResponseSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '商品 ID' }),
    status: AdminProductStatusSchema.openapi({ description: '更新后的状态' }),
  })
  .openapi({ description: '商品状态更新响应' })

export type AdminProductStatusUpdateResponse = z.infer<typeof AdminProductStatusUpdateResponseSchema>

// ============================================
// 商品统计相关 DTO
// ============================================

export const AdminProductStatsSchema = z
  .object({
    totalProducts: z.number().openapi({ description: '总商品数' }),
    publishedCount: z.number().openapi({ description: '已上架商品数' }),
    draftCount: z.number().openapi({ description: '草稿商品数' }),
    featuredCount: z.number().openapi({ description: '精选商品数' }),
    todayAdded: z.number().openapi({ description: '今日新增商品数' }),
    lowStockCount: z.number().openapi({ description: '库存预警商品数（库存 < 10）' }),
  })
  .openapi({ description: '商品统计数据' })

export type AdminProductStats = z.infer<typeof AdminProductStatsSchema>

// ============================================
// 批量操作相关 DTO
// ============================================

export const BatchUpdateProductStatusRequestSchema = z
  .object({
    productIds: z.array(z.string().uuid()).min(1, '至少选择一个商品').openapi({ description: '商品 ID 列表' }),
    status: AdminProductStatusSchema.openapi({ description: '目标状态' }),
  })
  .openapi({ description: '批量更新商品状态请求' })

export type BatchUpdateProductStatusRequest = z.infer<typeof BatchUpdateProductStatusRequestSchema>

export const BatchUpdateProductStatusResponseSchema = z
  .object({
    updatedCount: z.number().openapi({ description: '成功更新的商品数量' }),
    failedIds: z.array(z.string().uuid()).openapi({ description: '更新失败的商品 ID 列表' }),
  })
  .openapi({ description: '批量更新商品状态响应' })

export type BatchUpdateProductStatusResponse = z.infer<typeof BatchUpdateProductStatusResponseSchema>

export const BatchDeleteProductsRequestSchema = z
  .object({
    productIds: z.array(z.string().uuid()).min(1, '至少选择一个商品').openapi({ description: '商品 ID 列表' }),
  })
  .openapi({ description: '批量删除商品请求' })

export type BatchDeleteProductsRequest = z.infer<typeof BatchDeleteProductsRequestSchema>

export const BatchDeleteProductsResponseSchema = z
  .object({
    deletedCount: z.number().openapi({ description: '成功删除的商品数量' }),
    failedIds: z.array(z.string().uuid()).openapi({ description: '删除失败的商品 ID 列表' }),
  })
  .openapi({ description: '批量删除商品响应' })

export type BatchDeleteProductsResponse = z.infer<typeof BatchDeleteProductsResponseSchema>
