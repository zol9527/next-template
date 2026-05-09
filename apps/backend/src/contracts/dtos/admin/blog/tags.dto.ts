import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const AdminBlogTagSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '标签 ID' }),
    name: z.string().openapi({ description: '标签名称' }),
    slug: z.string().openapi({ description: 'URL 友好标识' }),
    articleCount: z.number().optional().openapi({ description: '文章数量' }),
    createdAt: z.string().optional().openapi({ description: '创建时间 ISO' }),
  })
  .openapi({ description: '后台博客标签' })

export type AdminBlogTag = z.infer<typeof AdminBlogTagSchema>

export const AdminBlogTagListQuerySchema = z
  .object({
    keyword: z.string().optional().openapi({ description: '搜索关键词（标签名称）' }),
  })
  .openapi({ description: '后台博客标签列表查询参数' })

export type AdminBlogTagListQuery = z.infer<typeof AdminBlogTagListQuerySchema>

export const AdminBlogTagListResponseSchema = z
  .object({
    items: z.array(AdminBlogTagSchema).openapi({ description: '博客标签列表' }),
  })
  .openapi({ description: '后台博客标签列表响应' })

export type AdminBlogTagListResponse = z.infer<typeof AdminBlogTagListResponseSchema>

export const AdminCreateBlogTagRequestSchema = z
  .object({
    name: z.string().min(1).openapi({ description: '标签名称' }),
    slug: z.string().optional().openapi({ description: 'URL 友好标识（可选）' }),
  })
  .openapi({ description: '创建博客标签请求' })

export type AdminCreateBlogTagRequest = z.infer<typeof AdminCreateBlogTagRequestSchema>

export const AdminUpdateBlogTagRequestSchema = z
  .object({
    name: z.string().min(1).optional().openapi({ description: '标签名称' }),
    slug: z.string().optional().openapi({ description: 'URL 友好标识（可选）' }),
  })
  .openapi({ description: '更新博客标签请求' })

export type AdminUpdateBlogTagRequest = z.infer<typeof AdminUpdateBlogTagRequestSchema>

export const AdminBatchFindOrCreateTagsRequestSchema = z
  .object({
    names: z.array(z.string().min(1)).min(1).openapi({ description: '标签名称列表' }),
  })
  .openapi({ description: '批量查找或创建标签请求' })

export type AdminBatchFindOrCreateTagsRequest = z.infer<typeof AdminBatchFindOrCreateTagsRequestSchema>

export const AdminBatchFindOrCreateTagsResponseSchema = z
  .object({
    tags: z.array(AdminBlogTagSchema).openapi({ description: '标签列表' }),
  })
  .openapi({ description: '批量查找或创建标签响应' })

export type AdminBatchFindOrCreateTagsResponse = z.infer<typeof AdminBatchFindOrCreateTagsResponseSchema>

