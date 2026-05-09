import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import {
  AdminBatchUpdateArticleStatusRequestSchema,
  BatchDeleteArticlesRequestSchema,
} from '@/contracts/dtos/admin/blog/articles.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createBlogArticleRepository, createBlogTagRepository } from '@/repositories/factory/content/blog.factory'
import { createAdminBlogArticleService } from '@/services/content/admin-blog-article.service'

/**
 * File: route.ts
 * Description: 管理后台文章批量操作 API - 支持批量更新状态和批量软删除
 */

// PATCH /api/v1/admin/blog/articles/batch - 批量更新文章状态
export const PATCH = withV1Route({
  action: 'admin:blog:article:batch_update',
  schemas: {
    body: AdminBatchUpdateArticleStatusRequestSchema,
  },
  requireAccess: { action: 'write' as Action, scope: 'blog.articles' as Scope },
  handler: async ({ body, serviceContext, req }) => {
    const articles = await createBlogArticleRepository()
    const tags = await createBlogTagRepository()
    const service = createAdminBlogArticleService({ articles, tags }, serviceContext!)

    const result = await service.batchUpdateStatus({
      articleIds: body!.articleIds,
      status: body!.status,
    })

    return createJsonApiResponse(req, ok(result))
  },
})

// DELETE /api/v1/admin/blog/articles/batch - 批量软删除文章
export const DELETE = withV1Route({
  action: 'admin:blog:article:batch_delete',
  schemas: {
    body: BatchDeleteArticlesRequestSchema,
  },
  requireAccess: { action: 'write' as Action, scope: 'blog.articles' as Scope },
  handler: async ({ body, serviceContext, req }) => {
    const articles = await createBlogArticleRepository()
    const tags = await createBlogTagRepository()
    const service = createAdminBlogArticleService({ articles, tags }, serviceContext!)

    const result = await service.batchSoftDelete({
      articleIds: body!.articleIds,
    })

    return createJsonApiResponse(req, ok(result))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
