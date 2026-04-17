import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * 公开博客文章详情
 */
export const PublicBlogArticleSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '文章 ID' }),
    title: z.string().openapi({ description: '文章标题' }),
    slug: z.string().openapi({ description: 'URL 友好标识' }),
    excerpt: z.string().nullable().optional().openapi({ description: '文章摘要' }),
    content: z.string().nullable().optional().openapi({ description: '文章内容' }),
    coverImage: z.string().nullable().optional().openapi({ description: '封面图片 URL' }),
    categoryName: z.string().nullable().optional().openapi({ description: '分类名称' }),
    categorySlug: z.string().nullable().optional().openapi({ description: '分类 Slug' }),
    authorName: z.string().nullable().optional().openapi({ description: '作者名称' }),
    metaTitle: z.string().nullable().optional().openapi({ description: 'SEO 标题' }),
    metaDescription: z.string().nullable().optional().openapi({ description: 'SEO 描述' }),
    ogImage: z.string().nullable().optional().openapi({ description: '社交分享图片' }),
    viewCount: z.number().int().openapi({ description: '阅读次数' }),
    likeCount: z.number().int().openapi({ description: '点赞次数' }),
    tagNames: z.array(z.string()).openapi({ description: '标签名称列表' }),
    publishedAt: z.string().nullable().openapi({ description: '发布时间' }),
    createdAt: z.string().openapi({ description: '创建时间' }),
  })
  .openapi({ description: '公开博客文章' })

export type PublicBlogArticle = z.infer<typeof PublicBlogArticleSchema>

/**
 * 公开博客文章列表查询参数
 */
export const PublicBlogArticleListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(20).openapi({ description: '分页大小' }),
    cursor: z.string().nullable().optional().openapi({ description: '分页游标' }),
    keyword: z.string().optional().openapi({ description: '搜索关键词' }),
    categorySlug: z.string().optional().openapi({ description: '分类 Slug' }),
    tagSlug: z.string().optional().openapi({ description: '标签 Slug' }),
  })
  .openapi({ description: '公开博客文章列表查询参数' })

export type PublicBlogArticleListQuery = z.infer<typeof PublicBlogArticleListQuerySchema>

/**
 * 公开博客文章列表响应
 */
export const PublicBlogArticleListResponseSchema = z
  .object({
    items: z.array(PublicBlogArticleSchema).openapi({ description: '文章列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标' }),
    total: z.number().int().openapi({ description: '总数' }),
  })
  .openapi({ description: '公开博客文章列表响应' })

export type PublicBlogArticleListResponse = z.infer<typeof PublicBlogArticleListResponseSchema>

/**
 * 公开博客分类
 */
export const PublicBlogCategorySchema = z
  .object({
    id: z.string().uuid().openapi({ description: '分类 ID' }),
    name: z.string().openapi({ description: '分类名称' }),
    slug: z.string().openapi({ description: 'URL 友好标识' }),
    description: z.string().nullable().optional().openapi({ description: '分类描述' }),
    articleCount: z.number().int().optional().openapi({ description: '文章数量' }),
  })
  .openapi({ description: '公开博客分类' })

export type PublicBlogCategory = z.infer<typeof PublicBlogCategorySchema>

/**
 * 公开博客分类列表响应
 */
export const PublicBlogCategoryListResponseSchema = z
  .object({
    items: z.array(PublicBlogCategorySchema).openapi({ description: '分类列表' }),
  })
  .openapi({ description: '公开博客分类列表响应' })

export type PublicBlogCategoryListResponse = z.infer<typeof PublicBlogCategoryListResponseSchema>

/**
 * 公开博客标签
 */
export const PublicBlogTagSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '标签 ID' }),
    name: z.string().openapi({ description: '标签名称' }),
    slug: z.string().openapi({ description: 'URL 友好标识' }),
    articleCount: z.number().int().optional().openapi({ description: '文章数量' }),
  })
  .openapi({ description: '公开博客标签' })

export type PublicBlogTag = z.infer<typeof PublicBlogTagSchema>

/**
 * 公开博客标签列表响应
 */
export const PublicBlogTagListResponseSchema = z
  .object({
    items: z.array(PublicBlogTagSchema).openapi({ description: '标签列表' }),
  })
  .openapi({ description: '公开博客标签列表响应' })

export type PublicBlogTagListResponse = z.infer<typeof PublicBlogTagListResponseSchema>
