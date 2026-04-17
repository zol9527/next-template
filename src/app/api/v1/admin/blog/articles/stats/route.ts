import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createBlogArticleRepository, createBlogTagRepository } from '@/repositories/factory/content/blog.factory'
import { createAdminBlogArticleService } from '@/services/content/admin-blog-article.service'

/**
 * Function: GET
 *
 * Description: 获取文章统计数据（管理员）
 *
 * Returns:
 *     Response: 包含 totalArticles, publishedCount, draftCount, archivedCount, totalViews 的统计响应
 */
export const GET = withV1Route({
  action: 'admin:blog:articles:read',
  requireAccess: { action: 'read' as Action, scope: 'blog.articles' as Scope },
  handler: async ({ serviceContext, req }) => {
    const articles = await createBlogArticleRepository()
    const tags = await createBlogTagRepository()
    const service = createAdminBlogArticleService({ articles, tags }, serviceContext!)
    const stats = await service.getStats()

    return createJsonApiResponse(req, ok(stats))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
