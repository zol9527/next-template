import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok, fail } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createBlogArticleRepository, createBlogTagRepository } from '@/repositories/factory/content/blog.factory'
import { createAdminBlogArticleService } from '@/services/content/admin-blog-article.service'

/**
 * Function: POST
 *
 * Description: 取消发布文章，将文章归档（管理员）
 *
 * Parameters:
 *     params({ id: string }): 路径参数，包含文章 ID
 *
 * Returns:
 *     Response: 包含归档后的文章信息的响应
 */
export const POST = withV1Route<{ id: string }>({
  action: 'admin:blog:articles:execute',
  requireAccess: { action: 'execute' as Action, scope: 'blog.articles' as Scope },
  handler: async ({ params, serviceContext, req }) => {
    const articles = await createBlogArticleRepository()
    const tags = await createBlogTagRepository()
    const service = createAdminBlogArticleService({ articles, tags }, serviceContext!)

    try {
      const updated = await service.archiveArticle(params.id)

      if (!updated) {
        return createJsonApiResponse(req, fail('NOT_FOUND', '文章不存在'), { status: 404 })
      }

      return createJsonApiResponse(req, ok(updated))
    } catch (error) {
      const err = error as Error & { code?: string }
      if (err.code === 'NOT_FOUND') {
        return createJsonApiResponse(req, fail('NOT_FOUND', '文章不存在'), { status: 404 })
      }
      throw error
    }
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
