import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// 收藏类型枚举
export const FavoriteTypeEnum = z
  .enum(['course', 'product', 'article'])
  .openapi({ description: '收藏类型' })

export type FavoriteType = z.infer<typeof FavoriteTypeEnum>

// 收藏列表查询参数 Schema
export const FavoriteListQuerySchema = z
  .object({
    cursor: z.string().optional().openapi({ description: '分页游标（可选）' }),
    limit: z
      .coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .default(20)
      .openapi({ description: '每页数量（默认 20，最大 50）' }),
    type: FavoriteTypeEnum.optional().openapi({ description: '收藏类型筛选（可选）' }),
  })
  .openapi({ description: '收藏列表查询参数' })

export type FavoriteListQuery = z.infer<typeof FavoriteListQuerySchema>

// 添加收藏请求 Schema
export const AddFavoriteRequestSchema = z
  .object({
    targetId: z.string().uuid().openapi({ description: '目标 ID（课程/商品/文章 ID）' }),
    type: FavoriteTypeEnum.openapi({ description: '收藏类型' }),
  })
  .openapi({ description: '添加收藏请求' })

export type AddFavoriteRequest = z.infer<typeof AddFavoriteRequestSchema>

// 收藏项 Schema
export const FavoriteSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '收藏 ID' }),
    userId: z.string().uuid().openapi({ description: '用户 ID' }),
    targetType: FavoriteTypeEnum.openapi({ description: '收藏类型' }),
    targetId: z.string().uuid().openapi({ description: '目标 ID' }),
    createdAt: z.string().openapi({ description: '创建时间（ISO 8601）' }),
  })
  .openapi({ description: '收藏项' })

export type Favorite = z.infer<typeof FavoriteSchema>

// 收藏列表响应 Schema
export const FavoriteListResponseSchema = z
  .object({
    items: z.array(FavoriteSchema).openapi({ description: '收藏列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标（无更多数据时为 null）' }),
    hasMore: z.boolean().openapi({ description: '是否有更多数据' }),
  })
  .openapi({ description: '收藏列表响应' })

export type FavoriteListResponse = z.infer<typeof FavoriteListResponseSchema>

// 检查收藏状态响应 Schema
export const CheckFavoriteResponseSchema = z
  .object({
    isFavorited: z.boolean().openapi({ description: '是否已收藏' }),
    favoriteId: z.string().uuid().optional().openapi({ description: '收藏 ID（已收藏时返回）' }),
  })
  .openapi({ description: '检查收藏状态响应' })

export type CheckFavoriteResponse = z.infer<typeof CheckFavoriteResponseSchema>

// 移除收藏响应 Schema
export const RemoveFavoriteResponseSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '已移除的收藏 ID' }),
  })
  .openapi({ description: '移除收藏响应' })

export type RemoveFavoriteResponse = z.infer<typeof RemoveFavoriteResponseSchema>
