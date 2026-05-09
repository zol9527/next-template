import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import {
  AdminArticleListQuerySchema,
  AdminCreateArticleRequestSchema,
} from '@/contracts/dtos/admin/blog/articles.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createBlogArticleRepository, createBlogTagRepository } from '@/repositories/factory/content/blog.factory'
import { createAdminBlogArticleService } from '@/services/content/admin-blog-article.service'

/**
 * Function: GET
 *
 * Description: 获取文章列表（管理员）
 *
 * Parameters:
 *     query(AdminArticleListQuery): 查询参数（limit, cursor, keyword, status, categoryId）
 *
 * Returns:
 *     Response: 包含文章列表的分页响应
 */
export const GET = withV1Route({
  action: 'admin:blog:articles:read',
  schemas: { query: AdminArticleListQuerySchema },
  requireAccess: { action: 'read' as Action, scope: 'blog.articles' as Scope },
  handler: async ({ query, serviceContext, req }) => {
    const articles = await createBlogArticleRepository()
    const tags = await createBlogTagRepository()
    const service = createAdminBlogArticleService({ articles, tags }, serviceContext!)
    const data = await service.listArticles(query)

    return createJsonApiResponse(req, ok(data))
  },
})

/**
 * Function: POST
 *
 * Description: 创建文章（管理员）
 *
 * Parameters:
 *     body(AdminCreateArticleRequest): 创建文章请求体
 *
 * Returns:
 *     Response: 包含创建的文章信息的响应
 */
export const POST = withV1Route({
  action: 'admin:blog:articles:write',
  schemas: { body: AdminCreateArticleRequestSchema },
  requireAccess: { action: 'write' as Action, scope: 'blog.articles' as Scope },
  handler: async ({ body, userId, serviceContext, req }) => {
    const articles = await createBlogArticleRepository()
    const tags = await createBlogTagRepository()
    const service = createAdminBlogArticleService({ articles, tags }, serviceContext!)
    const created = await service.createArticle({
      title: body!.title,
      content: body!.content,
      excerpt: body!.excerpt,
      coverImage: body!.coverImage,
      categoryId: body!.categoryId,
      metaTitle: body!.metaTitle,
      metaDescription: body!.metaDescription,
      ogImage: body!.ogImage,
      tagIds: body!.tagIds,
      authorId: userId,
    })

    return createJsonApiResponse(req, ok(created))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
