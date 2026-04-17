import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const AdminArticleStatusSchema = z
  .enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  .openapi({ description: '文章状态' })

export type AdminArticleStatus = z.infer<typeof AdminArticleStatusSchema>

export const AdminArticleSourceTypeSchema = z
  .enum(['EDITOR', 'MARKDOWN', 'API'])
  .openapi({ description: '内容来源类型（编辑器/Markdown/API 导入）' })

export type AdminArticleSourceType = z.infer<typeof AdminArticleSourceTypeSchema>

export const AdminArticleSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '文章 ID' }),
    title: z.string().openapi({ description: '文章标题' }),
    slug: z.string().openapi({ description: 'URL 友好标识' }),
    excerpt: z.string().nullable().openapi({ description: '文章摘要' }),
    content: z.string().nullable().openapi({ description: '文章内容' }),
    coverImage: z.string().nullable().openapi({ description: '封面图片 URL' }),
    status: AdminArticleStatusSchema.openapi({ description: '文章状态' }),
    categoryId: z.string().uuid().nullable().openapi({ description: '分类 ID' }),
    categoryName: z.string().nullable().optional().openapi({ description: '分类名称' }),
    categorySlug: z.string().nullable().optional().openapi({ description: '分类 Slug' }),
    authorId: z.string().uuid().nullable().openapi({ description: '作者 ID' }),
    authorName: z.string().nullable().optional().openapi({ description: '作者名称' }),
    metaTitle: z.string().nullable().openapi({ description: 'SEO 标题' }),
    metaDescription: z.string().nullable().openapi({ description: 'SEO 描述' }),
    ogImage: z.string().nullable().openapi({ description: '社交分享图片' }),
    sourceType: AdminArticleSourceTypeSchema.openapi({ description: '文章来源类型' }),
    viewCount: z.number().openapi({ description: '浏览次数' }),
    likeCount: z.number().openapi({ description: '点赞次数' }),
    tagNames: z.array(z.string()).optional().openapi({ description: '标签名称列表' }),
    tagIds: z.array(z.string().uuid()).optional().openapi({ description: '标签 ID 列表' }),
    publishedAt: z.string().nullable().openapi({ description: '发布时间 ISO' }),
    createdAt: z.string().openapi({ description: '创建时间 ISO' }),
    updatedAt: z.string().openapi({ description: '更新时间 ISO' }),
    deletedAt: z.string().nullable().optional().openapi({ description: '删除时间 ISO' }),
  })
  .openapi({ description: '后台文章详情' })

export type AdminArticle = z.infer<typeof AdminArticleSchema>

export const AdminArticleListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(20).openapi({ description: '分页大小（默认 20，最大 50）' }),
    cursor: z.string().nullable().optional().openapi({ description: '分页游标' }),
    keyword: z.string().optional().openapi({ description: '搜索关键词（文章标题）' }),
    status: AdminArticleStatusSchema.optional().openapi({ description: '文章状态筛选' }),
    categoryId: z.string().uuid().optional().openapi({ description: '分类 ID 筛选' }),
  })
  .openapi({ description: '后台文章列表查询参数' })

export type AdminArticleListQuery = z.infer<typeof AdminArticleListQuerySchema>

export const AdminArticleListResponseSchema = z
  .object({
    items: z.array(AdminArticleSchema).openapi({ description: '文章列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标' }),
    totalCount: z.number().openapi({ description: '符合条件的记录总数' }),
  })
  .openapi({ description: '后台文章列表响应' })

export type AdminArticleListResponse = z.infer<typeof AdminArticleListResponseSchema>

export const AdminCreateArticleRequestSchema = z
  .object({
    title: z.string().min(1).openapi({ description: '文章标题' }),
    content: z.string().nullable().optional().openapi({ description: '文章内容' }),
    excerpt: z.string().nullable().optional().openapi({ description: '文章摘要' }),
    coverImage: z.string().nullable().optional().openapi({ description: '封面图片 URL' }),
    categoryId: z.string().uuid().nullable().optional().openapi({ description: '分类 ID' }),
    metaTitle: z.string().nullable().optional().openapi({ description: 'SEO 标题' }),
    metaDescription: z.string().nullable().optional().openapi({ description: 'SEO 描述' }),
    ogImage: z.string().nullable().optional().openapi({ description: '社交分享图片' }),
    tagIds: z.array(z.string().uuid()).optional().default([]).openapi({ description: '标签 ID 列表' }),
  })
  .openapi({ description: '创建文章请求' })

export type AdminCreateArticleRequest = z.infer<typeof AdminCreateArticleRequestSchema>

export const AdminUpdateArticleRequestSchema = z
  .object({
    title: z.string().min(1).optional().openapi({ description: '文章标题' }),
    slug: z.string().nullable().optional().openapi({ description: 'URL 友好标识' }),
    content: z.string().nullable().optional().openapi({ description: '文章内容' }),
    excerpt: z.string().nullable().optional().openapi({ description: '文章摘要' }),
    coverImage: z.string().nullable().optional().openapi({ description: '封面图片 URL' }),
    categoryId: z.string().uuid().nullable().optional().openapi({ description: '分类 ID' }),
    metaTitle: z.string().nullable().optional().openapi({ description: 'SEO 标题' }),
    metaDescription: z.string().nullable().optional().openapi({ description: 'SEO 描述' }),
    ogImage: z.string().nullable().optional().openapi({ description: '社交分享图片' }),
    status: AdminArticleStatusSchema.optional().openapi({ description: '文章状态' }),
    tagIds: z.array(z.string().uuid()).optional().openapi({ description: '标签 ID 列表' }),
  })
  .openapi({ description: '更新文章请求' })

export type AdminUpdateArticleRequest = z.infer<typeof AdminUpdateArticleRequestSchema>

export const AdminBatchUpdateArticleStatusRequestSchema = z
  .object({
    articleIds: z.array(z.string().uuid()).min(1).openapi({ description: '文章 ID 列表' }),
    status: AdminArticleStatusSchema.openapi({ description: '目标状态' }),
  })
  .openapi({ description: '批量更新文章状态请求' })

export type AdminBatchUpdateArticleStatusRequest = z.infer<typeof AdminBatchUpdateArticleStatusRequestSchema>

export const AdminBatchUpdateArticleStatusResponseSchema = z
  .object({
    updatedCount: z.number().openapi({ description: '成功更新的文章数量' }),
    failedIds: z.array(z.string().uuid()).openapi({ description: '更新失败的文章 ID 列表' }),
  })
  .openapi({ description: '批量更新文章状态响应' })

export type AdminBatchUpdateArticleStatusResponse = z.infer<typeof AdminBatchUpdateArticleStatusResponseSchema>

export const BatchDeleteArticlesRequestSchema = z
  .object({
    articleIds: z.array(z.string().uuid()).min(1, '至少选择一篇文章').openapi({ description: '文章 ID 列表' }),
  })
  .openapi({ description: '批量删除文章请求' })

export type BatchDeleteArticlesRequest = z.infer<typeof BatchDeleteArticlesRequestSchema>

export const BatchDeleteArticlesResponseSchema = z
  .object({
    deletedCount: z.number().openapi({ description: '成功删除的文章数量' }),
    failedIds: z.array(z.string().uuid()).openapi({ description: '删除失败的文章 ID 列表' }),
  })
  .openapi({ description: '批量删除文章响应' })

export type BatchDeleteArticlesResponse = z.infer<typeof BatchDeleteArticlesResponseSchema>
