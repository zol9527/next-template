import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const AdminBlogCategoryStatusSchema = z
  .enum(['ACTIVE', 'INACTIVE'])
  .openapi({ description: '博客分类状态' })

export type AdminBlogCategoryStatus = z.infer<typeof AdminBlogCategoryStatusSchema>

export const AdminBlogCategorySchema = z
  .object({
    id: z.string().uuid().openapi({ description: '分类 ID' }),
    name: z.string().openapi({ description: '分类名称' }),
    slug: z.string().openapi({ description: 'URL 友好标识' }),
    description: z.string().nullable().openapi({ description: '分类描述' }),
    parentId: z.string().uuid().nullable().openapi({ description: '父分类 ID' }),
    sortOrder: z.number().int().openapi({ description: '排序（越小越靠前）' }),
    status: AdminBlogCategoryStatusSchema.openapi({ description: '状态' }),
    articleCount: z.number().optional().openapi({ description: '文章数量' }),
    createdAt: z.string().optional().openapi({ description: '创建时间 ISO' }),
    updatedAt: z.string().optional().openapi({ description: '更新时间 ISO' }),
  })
  .openapi({ description: '后台博客分类' })

export type AdminBlogCategory = z.infer<typeof AdminBlogCategorySchema>

export const AdminBlogCategoryTreeResponseSchema = z
  .object({
    items: z.array(AdminBlogCategorySchema).openapi({ description: '博客分类列表' }),
  })
  .openapi({ description: '后台博客分类列表响应' })

export type AdminBlogCategoryTreeResponse = z.infer<typeof AdminBlogCategoryTreeResponseSchema>

export const AdminCreateBlogCategoryRequestSchema = z
  .object({
    name: z.string().min(1).openapi({ description: '分类名称' }),
    slug: z.string().optional().openapi({ description: 'URL 友好标识（可选）' }),
    description: z.string().nullable().optional().openapi({ description: '分类描述' }),
    parentId: z.string().uuid().nullable().optional().openapi({ description: '父分类 ID' }),
    sortOrder: z.number().int().optional().openapi({ description: '排序（可选）' }),
  })
  .openapi({ description: '创建博客分类请求' })

export type AdminCreateBlogCategoryRequest = z.infer<typeof AdminCreateBlogCategoryRequestSchema>

export const AdminUpdateBlogCategoryRequestSchema = z
  .object({
    name: z.string().min(1).optional().openapi({ description: '分类名称' }),
    slug: z.string().nullable().optional().openapi({ description: 'URL 友好标识（可选）' }),
    description: z.string().nullable().optional().openapi({ description: '分类描述' }),
    parentId: z.string().uuid().nullable().optional().openapi({ description: '父分类 ID' }),
    status: AdminBlogCategoryStatusSchema.optional().openapi({ description: '状态' }),
    sortOrder: z.number().int().optional().openapi({ description: '排序' }),
  })
  .openapi({ description: '更新博客分类请求' })

export type AdminUpdateBlogCategoryRequest = z.infer<typeof AdminUpdateBlogCategoryRequestSchema>
