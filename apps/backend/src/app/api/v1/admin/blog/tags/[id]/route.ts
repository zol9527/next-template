import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok, fail } from '@/contracts/api-response.schema'
import { AdminUpdateBlogTagRequestSchema } from '@/contracts/dtos/admin/blog/tags.dto'
import { IdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createBlogTagRepository } from '@/repositories/factory/content/blog.factory'
import { createAdminBlogTagService } from '@/services/content/admin-blog-tag.service'

/**
 * Function: PATCH
 *
 * Description: 更新博客标签（管理员）
 *
 * Returns:
 * 	Response: 包含更新后的标签信息的响应
 */
export const PATCH = withV1Route({
  action: 'admin:blog:tags:write',
  schemas: { params: IdParamsSchema, body: AdminUpdateBlogTagRequestSchema },
  requireAccess: { action: 'write' as Action, scope: 'blog.tags' as Scope },
  handler: async ({ params, body, serviceContext, req }) => {
    const tags = await createBlogTagRepository()
    const service = createAdminBlogTagService({ tags }, serviceContext!)

    try {
      const updated = await service.updateTag({
        tagId: params.id,
        name: body!.name,
        slug: body!.slug,
      })

      if (!updated) {
        return createJsonApiResponse(req, fail('NOT_FOUND', '标签不存在'), { status: 404 })
      }

      return createJsonApiResponse(req, ok(updated))
    } catch (error: any) {
      if (error.code === 'CONFLICT') {
        return createJsonApiResponse(req, fail('CONFLICT', error.message), { status: 409 })
      }
      throw error
    }
  },
})

/**
 * Function: DELETE
 *
 * Description: 删除博客标签（管理员）
 *
 * Returns:
 * 	Response: 包含删除结果的响应
 */
export const DELETE = withV1Route({
  action: 'admin:blog:tags:write',
  schemas: { params: IdParamsSchema },
  requireAccess: { action: 'write' as Action, scope: 'blog.tags' as Scope },
  handler: async ({ params, serviceContext, req }) => {
    const tags = await createBlogTagRepository()
    const service = createAdminBlogTagService({ tags }, serviceContext!)

    try {
      const result = await service.deleteTag(params.id)
      return createJsonApiResponse(req, ok(result))
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') {
        return createJsonApiResponse(req, fail('NOT_FOUND', error.message), { status: 404 })
      }
      throw error
    }
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
