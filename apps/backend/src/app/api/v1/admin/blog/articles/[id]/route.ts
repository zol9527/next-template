import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok, fail } from '@/contracts/api-response.schema'
import { AdminUpdateArticleRequestSchema } from '@/contracts/dtos/admin/blog/articles.dto'
import { IdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createBlogArticleRepository, createBlogTagRepository } from '@/repositories/factory/content/blog.factory'
import { createAdminBlogArticleService } from '@/services/content/admin-blog-article.service'

/**
 * Function: GET
 *
 * Description: 获取单篇文章详情（管理员）
 *
 * Parameters:
 *     params(IdParams): 路径参数，包含文章 ID
 *
 * Returns:
 *     Response: 包含文章详情的响应
 */
export const GET = withV1Route({
  action: 'admin:blog:articles:read',
  schemas: { params: IdParamsSchema },
  requireAccess: { action: 'read' as Action, scope: 'blog.articles' as Scope },
  handler: async ({ params, serviceContext, req }) => {
    const articles = await createBlogArticleRepository()
    const tags = await createBlogTagRepository()
    const service = createAdminBlogArticleService({ articles, tags }, serviceContext!)
    const article = await service.getArticleById(params.id)

    if (!article) {
      return createJsonApiResponse(req, fail('NOT_FOUND', '文章不存在'), { status: 404 })
    }

    return createJsonApiResponse(req, ok(article))
  },
})

/**
 * Function: PATCH
 *
 * Description: 更新文章信息（管理员）
 *
 * Parameters:
 *     params(IdParams): 路径参数，包含文章 ID
 *     body(AdminUpdateArticleRequest): 更新文章请求体
 *
 * Returns:
 *     Response: 包含更新后的文章信息的响应
 */
export const PATCH = withV1Route({
  action: 'admin:blog:articles:write',
  schemas: { params: IdParamsSchema, body: AdminUpdateArticleRequestSchema },
  requireAccess: { action: 'write' as Action, scope: 'blog.articles' as Scope },
  handler: async ({ params, body, serviceContext, req }) => {
    const articles = await createBlogArticleRepository()
    const tags = await createBlogTagRepository()
    const service = createAdminBlogArticleService({ articles, tags }, serviceContext!)

    try {
      const updated = await service.updateArticle({
        articleId: params.id,
        title: body!.title,
        slug: body!.slug,
        content: body!.content,
        excerpt: body!.excerpt,
        coverImage: body!.coverImage,
        categoryId: body!.categoryId,
        metaTitle: body!.metaTitle,
        metaDescription: body!.metaDescription,
        ogImage: body!.ogImage,
        tagIds: body!.tagIds,
      })

      if (!updated) {
        return createJsonApiResponse(req, fail('NOT_FOUND', '文章不存在'), { status: 404 })
      }

      return createJsonApiResponse(req, ok(updated))
    } catch (error) {
      const err = error as Error & { code?: string }
      if (err.code === 'NOT_FOUND') {
        return createJsonApiResponse(req, fail('NOT_FOUND', '文章不存在'), { status: 404 })
      }
      if (err.code === 'CONFLICT') {
        return createJsonApiResponse(req, fail('CONFLICT', err.message), { status: 409 })
      }
      throw error
    }
  },
})

/**
 * Function: DELETE
 *
 * Description: 软删除文章（管理员）
 *
 * Parameters:
 *     params(IdParams): 路径参数，包含文章 ID
 *
 * Returns:
 *     Response: 包含删除结果的响应
 */
export const DELETE = withV1Route({
  action: 'admin:blog:articles:write',
  schemas: { params: IdParamsSchema },
  requireAccess: { action: 'write' as Action, scope: 'blog.articles' as Scope },
  handler: async ({ params, serviceContext, req }) => {
    const articles = await createBlogArticleRepository()
    const tags = await createBlogTagRepository()
    const service = createAdminBlogArticleService({ articles, tags }, serviceContext!)
    const result = await service.deleteArticle(params.id)

    if (!result) {
      return createJsonApiResponse(req, fail('NOT_FOUND', '文章不存在'), { status: 404 })
    }

    return createJsonApiResponse(req, ok(result))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
