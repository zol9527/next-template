import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const PublicCategorySchema = z
  .object({
    id: z.string().uuid().openapi({ description: '分类 ID' }),
    parentId: z.string().uuid().nullable().openapi({ description: '父分类 ID' }),
    name: z.string().openapi({ description: '分类名称' }),
    sortOrder: z.number().int().openapi({ description: '排序（越小越靠前）' }),
    icon: z.string().nullable().optional().openapi({ description: '分类图标/Emoji' }), // Added for UI
  })
  .openapi({ description: '公开分类' })

export type PublicCategory = z.infer<typeof PublicCategorySchema>

export const PublicCategoryListResponseSchema = z
  .object({
    items: z.array(PublicCategorySchema).openapi({ description: '分类列表' }),
  })
  .openapi({ description: '公开分类列表响应' })

export type PublicCategoryListResponse = z.infer<typeof PublicCategoryListResponseSchema>
