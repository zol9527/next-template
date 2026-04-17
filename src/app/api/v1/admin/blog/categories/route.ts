import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { AdminCreateBlogCategoryRequestSchema } from '@/contracts/dtos/admin/blog/categories.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createBlogCategoryRepository } from '@/repositories/factory/content/blog.factory'
import { createAdminBlogCategoryService } from '@/services/content/admin-blog-category.service'

/**
 * Function: GET
 *
 * Description: 获取博客分类列表（管理员，支持搜索）
 *
 * Returns:
 * 	Response: 包含博客分类列表的响应
 */
export const GET = withV1Route({
  action: 'admin:blog:categories:read',
  requireAccess: { action: 'read' as Action, scope: 'blog.categories' as Scope },
  handler: async ({ query, serviceContext, req }) => {
    const categories = await createBlogCategoryRepository()
    const service = createAdminBlogCategoryService({ categories }, serviceContext!)
    const data = await service.listCategories({ search: (query as Record<string, string>)?.keyword })

    return createJsonApiResponse(req, ok(data))
  },
})

/**
 * Function: POST
 *
 * Description: 创建博客分类（管理员）
 *
 * Returns:
 * 	Response: 包含创建的博客分类信息的响应
 */
export const POST = withV1Route({
  action: 'admin:blog:categories:write',
  schemas: { body: AdminCreateBlogCategoryRequestSchema },
  requireAccess: { action: 'write' as Action, scope: 'blog.categories' as Scope },
  handler: async ({ body, serviceContext, req }) => {
    const categories = await createBlogCategoryRepository()
    const service = createAdminBlogCategoryService({ categories }, serviceContext!)
    const created = await service.createCategory({
      name: body!.name,
      slug: body!.slug,
      description: body!.description,
      parentId: body!.parentId,
      sortOrder: body!.sortOrder,
    })

    return createJsonApiResponse(req, ok(created))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
