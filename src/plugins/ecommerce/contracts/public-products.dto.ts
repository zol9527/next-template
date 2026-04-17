import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const PublicProductStatusSchema = z
  .enum(['published'])
  .openapi({ description: '公开商品状态（仅支持已发布）' })

export const MoneySchema = z
  .object({
    amount: z.string().openapi({ description: '金额字符串' }),
    currencyCode: z.string().openapi({ description: '币种' }),
  })
  .openapi({ description: '金额' })

export const PublicProductSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '商品 ID' }),
    name: z.string().openapi({ description: '商品名称' }),
    slug: z.string().nullable().openapi({ description: 'URL 友好标识' }),
    summary: z.string().nullable().openapi({ description: '短简介' }),
    description: z.string().nullable().openapi({ description: '详情文本' }),
    kind: z.string().openapi({ description: '商品类型' }),
    price: MoneySchema.openapi({ description: '售价' }),
    originalPrice: MoneySchema.nullable().openapi({ description: '原价' }),
    isFeatured: z.boolean().openapi({ description: '是否推荐' }),
    tags: z.array(z.string()).openapi({ description: '商品标签' }),
    coverAssetId: z.string().uuid().nullable().optional().openapi({ description: '封面资源 ID（已废弃，不在响应中返回）' }),
    coverUrl: z.string().nullable().optional().openapi({ description: '封面图片 URL' }),
    mediaAssetIds: z.array(z.string().uuid()).optional().openapi({ description: '媒体资源 ID 列表（已废弃，不在响应中返回）' }),
    mediaUrls: z.array(z.string()).default([]).optional().openapi({ description: '媒体图片 URL 列表' }),
    createdAt: z.string().openapi({ description: '创建时间' }),
  })
  .openapi({ description: '公开商品' })

export type PublicProduct = z.infer<typeof PublicProductSchema>

export const PublicProductListResponseSchema = z
  .object({
    items: z.array(PublicProductSchema).openapi({ description: '商品列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标' }),
    total: z.number().openapi({ description: '总数' }),
  })
  .openapi({ description: '公开商品列表响应' })

export type PublicProductListResponse = z.infer<typeof PublicProductListResponseSchema>

export const PublicProductListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(20).openapi({ description: '分页大小' }),
    cursor: z.string().nullable().optional().openapi({ description: '分页游标' }),
    keyword: z.string().optional().openapi({ description: '搜索关键词' }),
    categoryId: z.string().uuid().optional().openapi({ description: '分类 ID' }),
    featured: z.coerce.boolean().optional().openapi({ description: '仅推荐商品' }),
  })
  .openapi({ description: '公开商品列表查询参数' })

export type PublicProductListQuery = z.infer<typeof PublicProductListQuerySchema>
