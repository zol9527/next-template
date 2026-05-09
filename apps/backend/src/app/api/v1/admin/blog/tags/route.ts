import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok, fail } from '@/contracts/api-response.schema'
import {
  AdminBlogTagListQuerySchema,
  AdminCreateBlogTagRequestSchema,
} from '@/contracts/dtos/admin/blog/tags.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createBlogTagRepository } from '@/repositories/factory/content/blog.factory'
import { createAdminBlogTagService } from '@/services/content/admin-blog-tag.service'

/**
 * Function: GET
 *
 * Description: 获取博客标签列表（管理员）
 *
 * Returns:
 * 	Response: 包含标签列表的响应
 */
export const GET = withV1Route({
  action: 'admin:blog:tags:read',
  schemas: { query: AdminBlogTagListQuerySchema },
  requireAccess: { action: 'read' as Action, scope: 'blog.tags' as Scope },
  handler: async ({ query, serviceContext, req }) => {
    const tags = await createBlogTagRepository()
    const service = createAdminBlogTagService({ tags }, serviceContext!)
    const data = await service.listTags(query)

    return createJsonApiResponse(req, ok(data))
  },
})

/**
 * Function: POST
 *
 * Description: 创建博客标签（管理员）
 *
 * Returns:
 * 	Response: 包含创建的标签信息的响应
 */
export const POST = withV1Route({
  action: 'admin:blog:tags:write',
  schemas: { body: AdminCreateBlogTagRequestSchema },
  requireAccess: { action: 'write' as Action, scope: 'blog.tags' as Scope },
  handler: async ({ body, serviceContext, req }) => {
    const tags = await createBlogTagRepository()
    const service = createAdminBlogTagService({ tags }, serviceContext!)

    try {
      const created = await service.createTag({
        name: body!.name,
        slug: body!.slug,
      })
      return createJsonApiResponse(req, ok(created))
    } catch (error: any) {
      if (error.code === 'CONFLICT') {
        return createJsonApiResponse(req, fail('CONFLICT', error.message), { status: 409 })
      }
      throw error
    }
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
